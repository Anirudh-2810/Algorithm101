import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#00f2ff', '#6366f1', '#00ff88', '#ff9f0a', '#ff6464', '#a78bfa', '#f472b6', '#fbbf24'];

export function GenreChart({ genres }) {
  if (!genres || Object.keys(genres).length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '13px' }}>
        No genre data yet
      </div>
    );
  }

  const chartData = Object.entries(genres).map(([name, g]) => ({
    name,
    value: g.count,
  }));

  return (
    <div data-testid="genre-chart">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgba(15,15,20,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'DM Mono, monospace',
              color: '#e4e4e7',
            }}
            formatter={(value, name) => [`${value} videos`, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
        {chartData.map((entry, i) => (
          <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '2px',
              background: COLORS[i % COLORS.length],
            }} />
            <span className="ui-label" style={{ fontSize: '10px' }}>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
