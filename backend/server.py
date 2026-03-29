from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import httpx
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

YT_KEY = os.environ.get('YOUTUBE_API_KEY', '')
YT_BASE = 'https://www.googleapis.com/youtube/v3'
MIN_VIEWS = 50000

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ALL_GENRES = ['Pop', 'Pop/K-Pop', 'Hip-Hop', 'R&B', 'Electronic', 'Latin', 'Rock/Alt', 'Country']

TRACKED = ['Pop', 'Hip-Hop', 'Electronic', 'R&B']
ALPHA = 0.3
hidden_state = [0.0, 0.0, 0.0, 0.0]


# --- Genre Classification ---
def classify_genre(title, channel, description, tags):
    src = ' '.join([title, channel, description, ' '.join(tags or [])]).lower()

    if re.search(r'bts|blackpink|twice|stray kids|aespa|ive\b|newjeans|seventeen|nct|txt\b|itzy|le sserafim|jungkook|suga\b|jennie|lisa\b|rosé|k-pop|kpop', src):
        return 'Pop/K-Pop'
    if re.search(r'taylor swift|ariana grande|dua lipa|billie eilish|olivia rodrigo|harry styles|ed sheeran|sabrina carpenter|charli xcx|chappell roan', src):
        return 'Pop'
    if re.search(r'\bfeat\.\b|\bft\.\b|rap god|hip.?hop|drill|trap music|lil |young |nicki minaj|drake|travis scott|21 savage|offset|future\b|metro boomin|kendrick|j\.? cole|asap|playboi', src):
        return 'Hip-Hop'
    if re.search(r'r&b|rnb|\bsza\b|\busher\b|beyonc|the weeknd|frank ocean|bryson tiller|summer walker|jhene|giveon|daniel caesar|brent faiyaz', src):
        return 'R&B'
    if re.search(r'\bedm\b|\bdj\b|deadmau5|skrillex|martin garrix|calvin harris|tiesto|david guetta|avicii|marshmello|illenium|phonk|lo-fi|lofi|synthwave|nightcore|house music|techno|dubstep', src):
        return 'Electronic'
    if re.search(r'bad bunny|j balvin|maluma|reggaeton|latin|shakira|karol g|ozuna|daddy yankee|anuel|rauw alejandro', src):
        return 'Latin'
    if re.search(r'rock\b|metal\b|punk\b|indie\b|alternative|grunge|foo fighters|imagine dragons|twenty one pilots|coldplay|radiohead|arctic monkeys', src):
        return 'Rock/Alt'
    if re.search(r'country|morgan wallen|luke combs|zach bryan|kane brown|blake shelton|carrie underwood|nashville', src):
        return 'Country'
    return 'Pop'


# --- Scoring ---
def safe_int(v):
    return int(v or 0)


def eng_score(likes, views, comments):
    if views < MIN_VIEWS:
        return 0
    return (likes / views) * 1000 + (comments / 100)


def vel_score(views, comments, published_at):
    age_h = max(1, (datetime.now(timezone.utc) - published_at).total_seconds() / 3600)
    return (views / age_h / 1000) + (comments / age_h / 10)


def parse_date(s):
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return datetime.now(timezone.utc)


# --- YouTube Fetch ---
async def fetch_current_trending(client_http):
    params = {
        'part': 'statistics,snippet,contentDetails',
        'chart': 'mostPopular',
        'videoCategoryId': '10',
        'maxResults': '50',
        'regionCode': 'US',
        'key': YT_KEY,
    }
    resp = await client_http.get(f'{YT_BASE}/videos', params=params)
    resp.raise_for_status()
    return resp.json().get('items', [])


async def fetch_historical_trending(client_http, days_ago, days_window):
    before = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
    after = (datetime.now(timezone.utc) - timedelta(days=days_ago + days_window)).isoformat()

    params = {
        'part': 'snippet',
        'q': 'music official video',
        'type': 'video',
        'videoCategoryId': '10',
        'order': 'viewCount',
        'publishedAfter': after,
        'publishedBefore': before,
        'maxResults': '25',
        'regionCode': 'US',
        'key': YT_KEY,
    }
    resp = await client_http.get(f'{YT_BASE}/search', params=params)
    resp.raise_for_status()
    ids = [i.get('id', {}).get('videoId') for i in resp.json().get('items', []) if i.get('id', {}).get('videoId')]
    if not ids:
        return []

    vresp = await client_http.get(f'{YT_BASE}/videos', params={
        'part': 'statistics,snippet',
        'id': ','.join(ids),
        'key': YT_KEY,
    })
    vresp.raise_for_status()
    return vresp.json().get('items', [])


async def fetch_shorts(client_http):
    after = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    params = {
        'part': 'snippet',
        'q': 'music #shorts trending 2025',
        'type': 'video',
        'order': 'viewCount',
        'publishedAfter': after,
        'maxResults': '20',
        'key': YT_KEY,
    }
    resp = await client_http.get(f'{YT_BASE}/search', params=params)
    resp.raise_for_status()
    ids = list(set([i.get('id', {}).get('videoId') for i in resp.json().get('items', []) if i.get('id', {}).get('videoId')]))
    if not ids:
        return []

    vresp = await client_http.get(f'{YT_BASE}/videos', params={
        'part': 'statistics,snippet',
        'id': ','.join(ids),
        'key': YT_KEY,
    })
    vresp.raise_for_status()
    return vresp.json().get('items', [])


# --- Process Batch ---
def process_batch(items, is_shorts):
    buckets = {}
    for g in ALL_GENRES:
        buckets[g] = {
            'count': 0, 'totalScore': 0, 'topTrack': '', 'topViews': 0,
            'bestScore': -1, 'bestScoreValue': 0, 'bestTrack': ''
        }

    for item in items:
        snip = item.get('snippet', {})
        stats = item.get('statistics', {})
        title = snip.get('title', '')
        channel = snip.get('channelTitle', '')
        desc = (snip.get('description', '') or '')[:200]
        tags = snip.get('tags', [])
        pub = parse_date(snip.get('publishedAt', ''))

        likes = safe_int(stats.get('likeCount'))
        views = safe_int(stats.get('viewCount'))
        comments = safe_int(stats.get('commentCount'))

        if views < MIN_VIEWS:
            continue

        genre = classify_genre(title, channel, desc, tags)
        g = buckets.get(genre)
        if not g:
            continue

        score = vel_score(views, comments, pub) if is_shorts else eng_score(likes, views, comments)

        g['count'] += 1
        g['totalScore'] += score

        if views > g['topViews']:
            g['topViews'] = views
            g['topTrack'] = title
        if score > g['bestScore']:
            g['bestScore'] = score
            g['bestScoreValue'] = round(score, 2)
            g['bestTrack'] = title

    return buckets


# --- Trend Forecasting ---
def forecast_trends(now_buckets, month1_buckets, month3_buckets):
    forecast = {}
    total_now = sum(b['count'] for b in now_buckets.values()) or 1
    total_m1 = sum(b['count'] for b in month1_buckets.values()) or 1
    total_m3 = sum(b['count'] for b in month3_buckets.values()) or 1

    for genre in ALL_GENRES:
        share_now = (now_buckets.get(genre, {}).get('count', 0) / total_now) * 100
        share_m1 = (month1_buckets.get(genre, {}).get('count', 0) / total_m1) * 100
        share_m3 = (month3_buckets.get(genre, {}).get('count', 0) / total_m3) * 100

        momentum_1mo = share_now - share_m1
        momentum_3mo = share_now - share_m3
        acceleration = momentum_1mo - (share_m1 - share_m3)

        if acceleration > 2:
            trend = 'SURGING'
        elif acceleration > 0:
            trend = 'RISING'
        elif acceleration < -2:
            trend = 'FALLING'
        else:
            trend = 'STABLE'

        forecast[genre] = {
            'shareNow': round(share_now, 1),
            'shareMonth1': round(share_m1, 1),
            'shareMonth3': round(share_m3, 1),
            'momentum1mo': round(momentum_1mo, 1),
            'momentum3mo': round(momentum_3mo, 1),
            'acceleration': round(acceleration, 1),
            'trend': trend,
        }

    return forecast


# --- Viral Song Prediction ---
def build_reasoning(genre, forecast, rising_bonus, shorts_bonus):
    parts = []
    if forecast and forecast.get('trend') == 'SURGING':
        parts.append(f"{genre} is surging — share up {forecast['momentum3mo']}% vs 3 months ago")
    elif forecast and forecast.get('trend') == 'RISING':
        parts.append(f"{genre} is on the rise")
    else:
        parts.append(f"{genre} genre trend: {forecast.get('trend', 'STABLE') if forecast else 'STABLE'}")

    if rising_bonus > 0:
        parts.append('high engagement but not yet #1 — still climbing')
    if shorts_bonus > 0:
        parts.append('same genre trending on Shorts — imminent crossover')
    return ' · '.join(parts)


def predict_viral_songs(now_buckets, shorts_buckets, genre_forecast):
    candidates = []

    for genre in ALL_GENRES:
        g_now = now_buckets.get(genre)
        g_shorts = shorts_buckets.get(genre)
        g_fc = genre_forecast.get(genre)
        if not g_now or g_now['count'] == 0:
            continue

        momentum_bonus = max(0, (g_fc.get('acceleration', 0) if g_fc else 0) * 2)
        rising_bonus = 15 if g_now['bestTrack'] != g_now['topTrack'] else 0
        shorts_bonus = 10 if g_shorts and g_shorts['count'] > 0 else 0

        composite = (g_now['bestScoreValue'] or 0) + momentum_bonus + rising_bonus + shorts_bonus

        if g_now['bestTrack']:
            candidates.append({
                'song': g_now['bestTrack'],
                'genre': genre,
                'compositeScore': round(composite, 2),
                'engScore': g_now['bestScoreValue'] or 0,
                'momentumBonus': round(momentum_bonus, 1),
                'risingBonus': rising_bonus,
                'shortsBonus': shorts_bonus,
                'genreTrend': g_fc.get('trend', 'STABLE') if g_fc else 'STABLE',
                'genreAccel': g_fc.get('acceleration', 0) if g_fc else 0,
                'reasoning': build_reasoning(genre, g_fc, rising_bonus, shorts_bonus),
            })

        if g_shorts and g_shorts['bestTrack']:
            candidates.append({
                'song': g_shorts['bestTrack'],
                'genre': genre,
                'compositeScore': round((g_shorts['bestScoreValue'] or 0) * 1.5 + momentum_bonus, 2),
                'engScore': 0,
                'momentumBonus': round(momentum_bonus, 1),
                'risingBonus': 0,
                'shortsBonus': 20,
                'genreTrend': g_fc.get('trend', 'STABLE') if g_fc else 'STABLE',
                'genreAccel': g_fc.get('acceleration', 0) if g_fc else 0,
                'reasoning': 'Fast-growing Short — Shorts virality predicts mainstream chart entry within 1-2 weeks.',
            })

    candidates.sort(key=lambda x: x['compositeScore'], reverse=True)
    return candidates[:5]


# --- Update Hidden State ---
def update_hidden(buckets):
    global hidden_state
    genre_idx = {'Pop': 0, 'Hip-Hop': 1, 'Electronic': 2, 'R&B': 3}
    for g, i in genre_idx.items():
        score = buckets.get(g, {}).get('bestScoreValue', 0)
        hidden_state[i] = round(ALPHA * score + (1 - ALPHA) * hidden_state[i], 4)


# --- Main Endpoint ---
@api_router.get("/analyze-trend")
async def analyze_trend():
    if not YT_KEY:
        return {"error": "YouTube API key not configured"}

    try:
        logger.info('Fetching trend data across 3 time windows...')
        async with httpx.AsyncClient(timeout=30.0) as hc:
            results = await asyncio.gather(
                fetch_current_trending(hc),
                fetch_historical_trending(hc, 30, 14),
                fetch_historical_trending(hc, 90, 20),
                fetch_shorts(hc),
                return_exceptions=True,
            )

        now_items = results[0] if not isinstance(results[0], Exception) else []
        month1_items = results[1] if not isinstance(results[1], Exception) else []
        month3_items = results[2] if not isinstance(results[2], Exception) else []
        shorts_items = results[3] if not isinstance(results[3], Exception) else []

        if not now_items:
            return {"error": "No trending music found. Check API key."}

        now_buckets = process_batch(now_items, False)
        month1_buckets = process_batch(month1_items, False)
        month3_buckets = process_batch(month3_items, False)
        shorts_buckets = process_batch(shorts_items, True)

        genre_forecast = forecast_trends(now_buckets, month1_buckets, month3_buckets)
        viral_predictions = predict_viral_songs(now_buckets, shorts_buckets, genre_forecast)
        update_hidden(now_buckets)

        frontend_genres = {}
        for g in ALL_GENRES:
            b = now_buckets[g]
            if b['count'] == 0:
                continue
            frontend_genres[g] = {
                'count': b['count'],
                'topTrack': b['topTrack'],
                'predictedHit': b['bestTrack'],
                'maxScoreValue': b['bestScoreValue'],
                'shortsNextHit': shorts_buckets.get(g, {}).get('bestTrack', ''),
                'shortsSong': shorts_buckets.get(g, {}).get('bestTrack', ''),
                'velocityValue': shorts_buckets.get(g, {}).get('bestScoreValue', 0),
                'forecast': genre_forecast.get(g),
            }

        shorts_list = []
        for item in shorts_items:
            views = safe_int(item.get('statistics', {}).get('viewCount'))
            if views < MIN_VIEWS:
                continue
            coms = safe_int(item.get('statistics', {}).get('commentCount'))
            pub = parse_date(item.get('snippet', {}).get('publishedAt', ''))
            title = item.get('snippet', {}).get('title', '')
            raw_name = re.sub(r'#\w+', '', title)
            raw_name = re.sub(r'[^\w\s\-\'\".,!?]', '', raw_name).strip()[:50]
            shorts_list.append({
                'title': title,
                'channel': item.get('snippet', {}).get('channelTitle', ''),
                'views': views,
                'velocity': round(vel_score(views, coms, pub), 2),
                'genre': classify_genre(title, item.get('snippet', {}).get('channelTitle', ''), '', []),
                'published': pub.isoformat(),
                'songName': raw_name,
            })

        shorts_list.sort(key=lambda x: x['velocity'], reverse=True)
        shorts_list = shorts_list[:6]

        current = {
            'title': now_items[0].get('snippet', {}).get('title', ''),
            'channel': now_items[0].get('snippet', {}).get('channelTitle', ''),
            'views': safe_int(now_items[0].get('statistics', {}).get('viewCount')),
        }

        result = {
            'current': current,
            'genres': frontend_genres,
            'genreForecast': genre_forecast,
            'viralPredictions': viral_predictions,
            'hiddenState': hidden_state,
            'topShorts': shorts_list,
            'dataWindows': {
                'now': len(now_items),
                'month1': len(month1_items),
                'month3': len(month3_items),
                'shorts': len(shorts_items),
            },
            'scannedAt': datetime.now(timezone.utc).isoformat(),
        }

        # Store scan in MongoDB
        scan_doc = {
            'id': str(uuid.uuid4()),
            'scannedAt': datetime.now(timezone.utc).isoformat(),
            'current': current,
            'viralPredictions': viral_predictions,
            'genreForecast': genre_forecast,
            'genres': {k: {'count': v['count'], 'topTrack': v['topTrack']} for k, v in frontend_genres.items()},
            'dataWindows': result['dataWindows'],
        }
        await db.scans.insert_one(scan_doc)

        return result

    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 403:
            return {"error": "YouTube API quota exceeded or invalid key."}
        if status == 400:
            return {"error": "Bad request — check API params.", "detail": str(e)}
        return {"error": "YouTube API error", "detail": str(e)}
    except Exception as e:
        logger.error(f'Error: {e}')
        return {"error": "Server error", "detail": str(e)}


@api_router.get("/scan-history")
async def get_scan_history():
    scans = await db.scans.find({}, {"_id": 0}).sort("scannedAt", -1).to_list(20)
    return {"scans": scans}


@api_router.get("/health")
async def health():
    return {"status": "ok", "youtube_key": bool(YT_KEY)}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
