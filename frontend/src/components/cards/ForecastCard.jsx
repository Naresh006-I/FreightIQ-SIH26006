import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function Card({ title, icon, children, accent = 'border-slate-800' }) {
  return (
    <div className={`bg-slate-900 border ${accent} rounded-2xl p-5 h-full`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function ForecastCard({ data, input }) {
  const { current_spot_rate, forecast_rate, upper_95, lower_95, seasonal_note, months_to_delivery } = data

  // Build a simple mini chart: spot → forecast with band
  const chartData = [
    { name: 'Now',      rate: current_spot_rate, upper: current_spot_rate * 1.02, lower: current_spot_rate * 0.98 },
    { name: `+${Math.ceil(months_to_delivery/2)}mo`, rate: (current_spot_rate + forecast_rate) / 2,
      upper: (current_spot_rate + upper_95) / 2, lower: (current_spot_rate + lower_95) / 2 },
    { name: input.period, rate: forecast_rate, upper: upper_95, lower: lower_95 },
  ]

  const trend = forecast_rate < current_spot_rate ? '↓' : '↑'
  const trendColor = forecast_rate < current_spot_rate ? 'text-emerald-400' : 'text-red-400'
  const changePct  = (((forecast_rate - current_spot_rate) / current_spot_rate) * 100).toFixed(1)

  return (
    <Card title="Freight Forecast" icon="📈" accent="border-sky-900/50">
      {/* Rate display */}
      <div className="flex items-end gap-3 mb-1">
        <div>
          <p className="text-xs text-slate-500">Current Spot</p>
          <p className="text-2xl font-black text-white">${current_spot_rate.toFixed(2)}<span className="text-sm font-normal text-slate-400">/MT</span></p>
        </div>
        <div className="pb-1">
          <span className={`text-lg font-bold ${trendColor}`}>{trend} {Math.abs(changePct)}%</span>
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-slate-800/50 rounded-xl p-3 mb-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500">Forecast ({input.period})</p>
          <p className="text-lg font-bold text-sky-400">${forecast_rate.toFixed(2)}<span className="text-xs text-slate-400">/MT</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">95% Band</p>
          <p className="text-xs text-slate-400">${lower_95.toFixed(1)} – ${upper_95.toFixed(1)}</p>
        </div>
      </div>

      {/* Mini chart */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`$${v.toFixed(2)}/MT`]}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#0ea5e9" fillOpacity={0.1} />
            <Area type="monotone" dataKey="rate"  stroke="#0ea5e9" strokeWidth={2} fill="url(#fcGrad)" dot={{ r: 3, fill: '#0ea5e9' }} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-slate-500 mt-3 leading-relaxed">{seasonal_note}</p>
    </Card>
  )
}
