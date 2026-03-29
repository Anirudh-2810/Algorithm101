export function TopShorts({ shorts }) {
  if (!shorts || shorts.length === 0) return null;

  return (
    <div data-testid="top-shorts">
      {shorts.map((s, i) => (
        <div key={`${s.title}-${i}`} className="shorts-item" data-testid={`shorts-item-${i}`}>
          <div className="flex justify-between items-start gap-3">
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '13px',
                color: '#fff',
                lineHeight: '1.4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {s.songName || s.title}
              </p>
              <p className="ui-label" style={{ fontSize: '10px', marginTop: '2px' }}>
                {s.channel}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 500 }}>
                {s.velocity.toFixed(1)}
              </p>
              <p className="ui-label" style={{ fontSize: '9px' }}>vel/hr</p>
            </div>
          </div>
          <div className="flex gap-3 mt-1" style={{ fontSize: '10px', color: 'var(--muted)' }}>
            <span>{(s.views || 0).toLocaleString()} views</span>
            <span style={{ color: 'var(--indigo)' }}>{s.genre}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
