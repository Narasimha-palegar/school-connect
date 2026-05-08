import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AttendanceChart({ attendance }) {
  if (!attendance || !attendance.summary) {
    return (
      <div className="bg-white border border-hair rounded-xl p-6 h-full flex flex-col justify-center items-center text-center">
        <h3 className="font-display font-bold text-xl text-ink mb-2">Attendance Summary</h3>
        <p className="text-ink-muted text-sm">No attendance data available yet.</p>
      </div>
    );
  }

  const { present, late, absent } = attendance.summary;
  
  const data = [
    { name: 'Present', count: present, color: '#214A39' },
    { name: 'Late', count: late, color: '#F2C55C' },
    { name: 'Absent', count: absent, color: '#DF5C3D' },
  ];

  return (
    <div className="bg-white border border-hair rounded-xl p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-xl text-ink">Attendance Summary</h3>
          <p className="text-sm text-ink-muted">Total days tracked: {attendance.summary.total}</p>
        </div>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
              stroke="#94A3B8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: '#F7F6F3' }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              formatter={(value) => [<span className="font-bold text-ink">{value} days</span>, 'Status']}
            />
            <Bar 
              dataKey="count" 
              radius={[8, 8, 0, 0]} 
              barSize={60}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
