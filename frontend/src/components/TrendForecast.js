export function TrendForecast({ forecast }) {
  if (!forecast) return null;

  const entries = Object.entries(forecast).filter(([_, v]) => v.shareNow > 0 || v.shareMonth1 > 0);

  if (entries.length === 0) return null;

  const trendColor = (t) => {
    if (t === 'SURGING') return 'var(--green)';
    if (t === 'RISING') return 'var(--cyan)';
    if (t === 'FALLING') return '#ff6464';
    return 'var(--muted)';
  };

  const accelIcon = (a) => {
    if (a > 2) return '+';
    if (a > 0) return '+';
    if (a < -2) return '-';
    return '=';
  };

  return (
    <div data-testid="trend-forecast" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Genre
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Now
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              1mo
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              3mo
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Accel
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 400, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Signal
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([genre, v]) => (
            <tr
              key={genre}
              data-testid={`forecast-row-${genre}`}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
            >
              <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 500 }}>{genre}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{v.shareNow}%</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{v.shareMonth1}%</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{v.shareMonth3}%</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                <span style={{ color: trendColor(v.trend) }}>
                  {accelIcon(v.acceleration)}{Math.abs(v.acceleration)}
                </span>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                <span className={`trend-badge ${v.trend === 'SURGING' ? 'trend-surging' : v.trend === 'RISING' ? 'trend-rising' : v.trend === 'FALLING' ? 'trend-falling' : 'trend-stable'}`}>
                  {v.trend}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
