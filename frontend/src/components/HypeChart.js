import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

export function HypeChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: '13px' }}>
        Run scans to build momentum data
      </div>
    );
  }

  const chartData = history.map((val, i) => ({
    idx: i,
    value: typeof val === 'number' ? parseFloat(val.toFixed(3)) : 0,
  }));

  return (
    <div data-testid="hype-chart">
      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="hypeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#hypeGrad)"
            dot={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,20,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
              color: '#e4e4e7',
            }}
            formatter={(v) => [v.toFixed(4), 'Hidden State']}
            labelFormatter={() => ''}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
