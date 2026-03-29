# AURA — Neural Trend Engine PRD

## Problem Statement
Port a Node.js + vanilla HTML music trend intelligence app to React + FastAPI + MongoDB. The app fetches live YouTube trending music data across 3 time windows, classifies genres, forecasts genre trajectories, and predicts which songs will go viral next week.

## Architecture
- **Frontend**: React 19 + Tailwind + Recharts (charts) + Lucide (icons)
- **Backend**: FastAPI + httpx (async YouTube API calls) + Motor (async MongoDB)
- **Database**: MongoDB — stores scan history
- **External API**: YouTube Data API v3

## User Personas
- Music enthusiasts tracking what's blowing up
- Content creators looking for trending sounds to ride
- Data nerds who like seeing the algorithm work

## Core Requirements
- [x] YouTube Data API v3 integration (4 parallel fetch windows)
- [x] Genre classification via multi-signal regex (title + channel + desc + tags)
- [x] Engagement scoring + velocity scoring
- [x] 3-window trend forecasting (now vs 1mo vs 3mo)
- [x] Viral song prediction with composite scoring
- [x] RNN hidden state visualization (animated)
- [x] Genre distribution donut chart
- [x] Hype momentum area chart
- [x] Viral Shorts velocity ranking
- [x] MongoDB scan persistence + history display
- [x] Dark theme: DM Mono + Syne, glass-morphism, neon accents
- [x] Responsive layout

## What's Been Implemented (Jan 2026)
- Full FastAPI backend with `/api/analyze-trend`, `/api/scan-history`, `/api/health`
- React frontend with 7 components: RnnBars, GenreChart, HypeChart, PredictionGrid, TrendForecast, TopShorts, ScanHistory
- Real YouTube data flowing (BTS, Fetty Wap, etc.)
- All tests passing 100%

## Backlog
- P1: Auto-refresh scans on interval
- P1: Click a prediction to see the YouTube video
- P2: Compare two scans side-by-side
- P2: Genre filter on predictions
- P3: User accounts + saved watchlists
