import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function ForecastCard({ data, input }) {
  const { current_spot_rate, forecast_rate, upper_95, lower_95, seasonal_note, months_to_delivery } = data
  const falling   = forecast_rate <= current_spot_rate
  const changePct = (((forecast_rate - current_spot_rate) / current_spot_rate) * 100).toFixed(1)

  const chart = [
    { label:'Now',                  rate: current_spot_rate,                   hi: current_spot_rate * 1.025, lo: current_spot_rate * 0.975 },
    { label:`+${Math.max(1, Math.ceil(months_to_delivery / 2))}mo`,
                                    rate: (current_spot_rate + forecast_rate) / 2,
                                    hi:   (upper_95 + current_spot_rate) / 2,
                                    lo:   (lower_95 + current_spot_rate) / 2 },
    { label: input.period,          rate: forecast_rate, hi: upper_95, lo: lower_95 },
  ]

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span>📈</span>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Freight Rate Forecast</span>
      </div>
      <div style={{ padding:16 }}>
        {/* Rate hero */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.05em' }}>Current Spot</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#003087', lineHeight:1.1 }}>
              ${current_spot_rate.toFixed(2)}<span style={{ fontSize:13, fontWeight:400, color:'#6b7a9e' }}>/MT</span>
            </div>
          </div>
          <div style={{ paddingBottom:4, fontSize:14, fontWeight:700,
                        color: falling ? '#1b5e20' : '#b71c1c' }}>
            {falling ? '▼' : '▲'} {Math.abs(changePct)}%
          </div>
        </div>

        {/* Forecast box */}
        <div style={{ background:'#f5f7fc', border:'1px solid #dde3f4', borderRadius:6,
                      padding:'10px 14px', display:'flex', justifyContent:'space-between',
                      alignItems:'center', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:'#6b7a9e' }}>Forecast ({input.period})</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#003087' }}>
              ${forecast_rate.toFixed(2)}<span style={{ fontSize:11, color:'#6b7a9e' }}>/MT</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'#6b7a9e' }}>95% Confidence Band</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1a2340' }}>${lower_95.toFixed(1)} – ${upper_95.toFixed(1)}</div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height:80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top:4, right:4, bottom:0, left:0 }}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#003087" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#003087" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize:10, fill:'#6b7a9e' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={['auto','auto']} />
              <Tooltip
                contentStyle={{ background:'white', border:'1px solid #dde3f4', borderRadius:5, fontSize:11 }}
                formatter={v => [`$${Number(v).toFixed(2)}/MT`]}
              />
              <Area type="monotone" dataKey="hi"   stroke="none" fill="#003087" fillOpacity={0.07} />
              <Area type="monotone" dataKey="rate" stroke="#003087" strokeWidth={2} fill="url(#fg)"
                    dot={{ r:3, fill:'#003087', strokeWidth:0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ fontSize:11, color:'#6b7a9e', marginTop:10, paddingTop:10,
                      borderTop:'1px solid #eef1fa', lineHeight:1.6 }}>
          {seasonal_note}
        </div>
      </div>
    </div>
  )
}
