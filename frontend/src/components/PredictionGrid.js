export function PredictionGrid({ predictions }) {
  if (!predictions || predictions.length === 0) return null;

  const trendClass = (t) => {
    if (t === 'SURGING') return 'trend-surging';
    if (t === 'RISING') return 'trend-rising';
    if (t === 'FALLING') return 'trend-falling';
    return 'trend-stable';
  };

  const maxScore = Math.max(...predictions.map(p => p.compositeScore), 1);

  return (
    <div data-testid="prediction-grid">
      <p className="ui-label" style={{ color: 'var(--green)', marginBottom: '12px' }}>
        Viral Predictions — Next Week
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {predictions.slice(0, 5).map((p, i) => (
          <div
            key={`${p.song}-${i}`}
            className="prediction-card"
            data-testid={`prediction-card-${i}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <span className="ui-label" style={{ color: 'var(--orange)', fontSize: '10px' }}>
                {p.genre}
              </span>
              <span className={`trend-badge ${trendClass(p.genreTrend)}`}>
                {p.genreTrend}
              </span>
            </div>

            <p style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#fff',
              lineHeight: '1.4',
              marginBottom: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {p.song}
            </p>

            <div className="score-bar" style={{ marginBottom: '6px' }}>
              <div
                className="score-bar-fill"
                style={{
                  width: `${(p.compositeScore / maxScore) * 100}%`,
                  background: p.compositeScore > maxScore * 0.7
                    ? 'var(--green)'
                    : p.compositeScore > maxScore * 0.4
                      ? 'var(--cyan)'
                      : 'var(--indigo)',
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <span style={{ fontSize: '11px', color: 'var(--green)' }}>
                Score: {p.compositeScore}
              </span>
              {p.shortsBonus > 0 && (
                <span className="ui-label" style={{ fontSize: '9px', color: 'var(--cyan)' }}>
                  Shorts boost
                </span>
              )}
            </div>

            {p.reasoning && (
              <p className="ui-label" style={{ fontSize: '9px', marginTop: '6px', lineHeight: '1.5', opacity: 0.7 }}>
                {p.reasoning}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
