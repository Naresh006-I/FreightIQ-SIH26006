import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function CardHeader({ icon, title, accent }) {
  return (
    <div className={`px-4 py-3 border-b border-gray-100 flex items-center gap-2 ${accent || 'bg-sail-navy'}`}>
      <span className="text-base">{icon}</span>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
    </div>
  )
}

export default function ForecastCard({ data, input }) {
  const { current_spot_rate, forecast_rate, upper_95, lower_95, seasonal_note, months_to_delivery } = data
  const trend    = forecast_rate < current_spot_rate
  const changePct = (((forecast_rate - current_spot_rate) / current_spot_rate) * 100).toFixed(1)

  const chartData = [
    { name: 'Now',          rate: current_spot_rate, upper: current_spot_rate * 1.03, lower: current_spot_rate * 0.97 },
    { name: `+${Math.max(1,Math.ceil(months_to_delivery/2))}mo`, rate: (current_spot_rate + forecast_rate) / 2, upper: (current_spot_rate + upper_95) / 2, lower: (current_spot_rate + lower_95) / 2 },
    { name: input.period,   rate: forecast_rate,      upper: upper_95,                lower: lower_95 },
  ]

  return (
    <div className="sail-card overflow-hidden">
      <CardHeader icon="📈" title="Freight Rate Forecast" />
      <div className="p-4">
        {/* Current rate */}
        <div className="flex items-end gap-3 mb-3">
          <div>
            <p className="text-[11px] text-sail-muted uppercase tracking-wide">Current Spot Rate</p>
            <p className="text-3xl font-black text-sail-navy">${current_spot_rate.toFixed(2)}<span className="text-sm font-normal text-sail-muted">/MT</span></p>
          </div>
          <div className={`pb-1 text-sm font-bold ${trend ? 'text-green-600' : 'text-red-600'}`}>
            {trend ? '▼' : '▲'} {Math.abs(changePct)}%
          </div>
        </div>

        {/* Forecast box */}
        <div className="bg-sail-offwhite border border-sail-gray rounded p-3 mb-3 flex justify-between items-center">
          <div>
            <p className="text-[11px] text-sail-muted">Forecast ({input.period})</p>
            <p className="text-xl font-bold text-sail-navy">${forecast_rate.toFixed(2)}<span className="text-xs text-sail-muted">/MT</span></p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-sail-muted">95% Confidence Band</p>
            <p className="text-[12px] text-sail-text font-medium">${lower_95.toFixed(1)} – ${upper_95.toFixed(1)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{top:4,right:4,bottom:0,left:0}}>
              <defs>
                <linearGradient id="sailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#003087" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#003087" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{fontSize:10, fill:'#6b7a9e'}} axisLine={false} tickLine={false} />
              <YAxis hide domain={['auto','auto']} />
              <Tooltip
                contentStyle={{background:'white',border:'1px solid #dde3f0',borderRadius:4,fontSize:11}}
                formatter={v => [`$${v.toFixed(2)}/MT`]}
              />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#003087" fillOpacity={0.07} />
              <Area type="monotone" dataKey="rate"  stroke="#003087" strokeWidth={2} fill="url(#sailGrad)" dot={{r:3,fill:'#003087'}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-sail-muted mt-2 leading-relaxed border-t border-sail-gray pt-2">{seasonal_note}</p>
      </div>
    </div>
  )
}
