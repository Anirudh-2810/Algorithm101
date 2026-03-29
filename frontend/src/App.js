import { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { RnnBars } from "@/components/RnnBars";
import { GenreChart } from "@/components/GenreChart";
import { HypeChart } from "@/components/HypeChart";
import { PredictionGrid } from "@/components/PredictionGrid";
import { TopShorts } from "@/components/TopShorts";
import { ScanHistory } from "@/components/ScanHistory";
import { TrendForecast } from "@/components/TrendForecast";
import { Zap, Activity, Clock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [data, setData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [hypeHistory, setHypeHistory] = useState([]);
  const [history, setHistory] = useState([]);
  const scanCountRef = useRef(0);

  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/scan-history`);
      setHistory(res.data.scans || []);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/analyze-trend`);
      const d = res.data;
      if (d.error) {
        setError(d.error);
        setScanning(false);
        return;
      }
      setData(d);
      scanCountRef.current += 1;

      setHypeHistory(prev => {
        const next = [...prev, d.hiddenState ? d.hiddenState[0] : Math.random()];
        return next.length > 20 ? next.slice(-20) : next;
      });

      loadHistory();
    } catch (e) {
      setError("Network error — couldn't reach the server.");
    }
    setScanning(false);
  };

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="grain" />

      <div className="app-container">
        {/* Header */}
        <header
          data-testid="app-header"
          style={{ borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}
          className="flex justify-between items-end flex-wrap gap-4"
        >
          <div>
            <p className="ui-label" style={{ color: 'var(--indigo)', marginBottom: '4px' }}>
              Project Aura x Insight
            </p>
            <h1 data-testid="app-title">Neural Trend Engine</h1>
            {data && (
              <p className="ui-label" style={{ marginTop: '8px', color: 'var(--muted)' }}>
                Last scan: {timeAgo(data.scannedAt)} — {data.dataWindows?.now || 0} videos processed
              </p>
            )}
          </div>
          <button
            data-testid="scan-button"
            className="scan-btn"
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? 'INGESTING...' : 'EXECUTE DEEP SCAN'}
          </button>
        </header>

        {/* Error */}
        {error && (
          <div
            data-testid="error-message"
            className="glass card"
            style={{ borderLeft: '4px solid #ff6464', marginTop: '24px' }}
          >
            <p style={{ color: '#ff6464', fontSize: '13px' }}>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!data && !scanning && !error && (
          <div
            data-testid="empty-state"
            className="flex flex-col items-center justify-center"
            style={{ paddingTop: '120px', paddingBottom: '120px' }}
          >
            <Zap size={48} style={{ color: 'var(--indigo)', opacity: 0.4, marginBottom: '20px' }} />
            <h2 style={{ color: 'var(--muted)', fontSize: '18px', fontWeight: 400, marginBottom: '8px' }}>
              Hit scan to pull live YouTube data
            </h2>
            <p className="ui-label" style={{ maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
              Analyzes 50+ trending music videos across 3 time windows to predict which songs will blow up next
            </p>
          </div>
        )}

        {/* Scanning state */}
        {scanning && !data && (
          <div
            data-testid="scanning-state"
            className="flex flex-col items-center justify-center"
            style={{ paddingTop: '120px', paddingBottom: '120px' }}
          >
            <Activity size={48} className="pulse-glow" style={{ color: 'var(--cyan)', marginBottom: '20px' }} />
            <h2 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 400 }}>
              Scanning YouTube trending data...
            </h2>
            <p className="ui-label" style={{ marginTop: '8px' }}>
              Fetching across current + 1mo + 3mo + Shorts windows
            </p>
          </div>
        )}

        {/* Main Grid */}
        {data && (
          <div
            className="grid-main"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: '24px',
              marginTop: '24px',
            }}
          >
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Top Track + Predictions */}
              <div
                data-testid="top-track-card"
                className="glass card hover-lift fade-up"
                style={{ borderLeft: '4px solid var(--orange)' }}
              >
                <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                  <div>
                    <p className="ui-label" style={{ color: 'var(--orange)', marginBottom: '6px' }}>
                      Currently Trending #1
                    </p>
                    <h2 data-testid="top-track-title" style={{ fontSize: '20px', lineHeight: '1.3' }}>
                      {data.current?.title || 'No data'}
                    </h2>
                    <p className="ui-label" style={{ marginTop: '4px' }}>
                      {data.current?.channel}
                    </p>
                  </div>
                  <span data-testid="top-track-views" className="ui-label" style={{ whiteSpace: 'nowrap' }}>
                    {(data.current?.views || 0).toLocaleString()} views
                  </span>
                </div>

                <PredictionGrid predictions={data.viralPredictions || []} />
              </div>

              {/* RNN */}
              <div
                data-testid="rnn-card"
                className="glass card fade-up"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="ui-label">RNN Hidden State Memory</span>
                  <code style={{ fontSize: '11px', color: 'var(--indigo)' }}>
                    h[t] = tanh(Wx + Uh[t-1])
                  </code>
                </div>
                <RnnBars hiddenState={data.hiddenState} />
              </div>

              {/* Trend Forecast */}
              <div
                data-testid="forecast-card"
                className="glass card fade-up"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="ui-label">Genre Trajectory Forecast</span>
                  <span className="ui-label" style={{ color: 'var(--cyan)' }}>
                    3-window analysis
                  </span>
                </div>
                <TrendForecast forecast={data.genreForecast} />
              </div>

              {/* Top Shorts */}
              {data.topShorts && data.topShorts.length > 0 && (
                <div
                  data-testid="shorts-card"
                  className="glass card fade-up"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="ui-label">Viral Shorts — Velocity Ranked</span>
                    <span className="ui-label" style={{ color: 'var(--green)' }}>
                      {data.dataWindows?.shorts || 0} tracked
                    </span>
                  </div>
                  <TopShorts shorts={data.topShorts} />
                </div>
              )}
            </div>

            {/* Right Column */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div
                data-testid="genre-chart-card"
                className="glass card fade-up"
                style={{ animationDelay: '0.1s' }}
              >
                <span className="ui-label" style={{ display: 'block', marginBottom: '16px' }}>
                  Genre Distribution
                </span>
                <GenreChart genres={data.genres} />
              </div>

              <div
                data-testid="hype-chart-card"
                className="glass card fade-up"
                style={{ animationDelay: '0.2s' }}
              >
                <span className="ui-label" style={{ display: 'block', marginBottom: '16px' }}>
                  Hype Momentum
                </span>
                <HypeChart history={hypeHistory} />
              </div>

              {/* Data Windows */}
              <div
                data-testid="data-windows-card"
                className="glass card fade-up"
                style={{ animationDelay: '0.3s' }}
              >
                <span className="ui-label" style={{ display: 'block', marginBottom: '12px' }}>
                  Data Coverage
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Trending Now', val: data.dataWindows?.now, color: 'var(--cyan)' },
                    { label: '1 Month Ago', val: data.dataWindows?.month1, color: 'var(--indigo)' },
                    { label: '3 Months Ago', val: data.dataWindows?.month3, color: 'var(--orange)' },
                    { label: 'Shorts', val: data.dataWindows?.shorts, color: 'var(--green)' },
                  ].map(w => (
                    <div key={w.label} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <p className="ui-label" style={{ marginBottom: '4px', fontSize: '10px' }}>{w.label}</p>
                      <p style={{ fontSize: '20px', fontWeight: 600, color: w.color, fontFamily: 'Syne, sans-serif' }}>
                        {w.val || 0}
                      </p>
                      <p className="ui-label" style={{ fontSize: '9px' }}>videos</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scan History */}
              {history.length > 0 && (
                <div
                  data-testid="scan-history-card"
                  className="glass card fade-up"
                  style={{ animationDelay: '0.4s' }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="ui-label">
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      Recent Scans
                    </span>
                    <span className="ui-label" style={{ fontSize: '10px' }}>{history.length} stored</span>
                  </div>
                  <ScanHistory scans={history} />
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
