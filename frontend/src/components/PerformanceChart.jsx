import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PerformanceChart({ results }) {
  if (!results || results.length === 0) {
    return (
      <div className="bg-white border border-hair rounded-xl p-6 h-full flex flex-col justify-center items-center text-center">
        <h3 className="font-display font-bold text-xl text-ink mb-2">Academic Performance</h3>
        <p className="text-ink-muted text-sm">No performance data available yet.</p>
      </div>
    );
  }

  // Format and sort data by date (assuming they come sorted DESC from API, so reverse for chart)
  const data = [...results].reverse().slice(-10).map(r => ({
    name: r.test_name,
    score: (r.score / (r.max_score || 100)) * 100,
    subject: r.subject,
    displayScore: `${r.score}/${r.max_score}`
  }));

  return (
    <div className="bg-white border border-hair rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-xl text-ink">Academic Performance</h3>
          <p className="text-sm text-ink-muted">Trend of recent test scores (%)</p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
            <XAxis 
              dataKey="name" 
              stroke="#94A3B8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#94A3B8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              cursor={{ stroke: '#DF5C3D', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(value, name, props) => [
                <span className="font-bold text-ink">{value.toFixed(1)}% <span className="text-xs font-normal text-ink-muted">({props.payload.displayScore})</span></span>,
                <span className="text-ink-muted">{props.payload.subject}</span>
              ]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#DF5C3D"
              strokeWidth={4}
              dot={{ r: 6, fill: '#DF5C3D', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#DF5C3D', strokeWidth: 2, stroke: '#fff' }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
