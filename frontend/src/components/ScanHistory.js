export function ScanHistory({ scans }) {
  if (!scans || scans.length === 0) return null;

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
    <div data-testid="scan-history" style={{ maxHeight: '260px', overflowY: 'auto' }}>
      {scans.slice(0, 10).map((scan, i) => (
        <div key={scan.id || i} className="history-item" data-testid={`history-item-${i}`}>
          <div className="flex justify-between items-start">
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize: '12px',
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {scan.current?.title || 'Scan'}
              </p>
              <p className="ui-label" style={{ fontSize: '9px', marginTop: '2px' }}>
                {scan.dataWindows
                  ? `${scan.dataWindows.now || 0} now + ${scan.dataWindows.shorts || 0} shorts`
                  : ''}
              </p>
            </div>
            <span className="ui-label" style={{ fontSize: '9px', flexShrink: 0, marginLeft: '8px' }}>
              {timeAgo(scan.scannedAt)}
            </span>
          </div>
          {scan.viralPredictions && scan.viralPredictions.length > 0 && (
            <p className="ui-label" style={{ fontSize: '9px', marginTop: '4px', color: 'var(--green)' }}>
              Top prediction: {scan.viralPredictions[0].song?.substring(0, 40)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
