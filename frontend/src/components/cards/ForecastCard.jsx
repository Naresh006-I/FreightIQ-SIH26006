import { useEffect, useState } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, CartesianGrid,
} from 'recharts'
import { apiFetch } from '../../config'

/* ── Custom tooltip ─────────────────────────────────────────────── */
function BDITooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:6,
                  padding:'8px 12px', fontSize:11, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight:700, color:'#003087', marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color, marginTop:2 }}>
          {p.name}: <strong>{Number(p.value).toFixed(p.name === 'BDI' ? 0 : 2)}</strong>
          {p.name === 'BDI' ? ' pts' : '/MT'}
        </div>
      ))}
    </div>
  )
}

export default function ForecastCard({ data, input }) {
  const { current_spot_rate, forecast_rate, upper_95, lower_95, seasonal_note, months_to_delivery } = data
  const falling    = forecast_rate <= current_spot_rate
  const changePct  = (((forecast_rate - current_spot_rate) / current_spot_rate) * 100).toFixed(1)

  const [bdiData,   setBdiData]   = useState(null)
  const [bdiLoad,   setBdiLoad]   = useState(true)
  const [activeTab, setActiveTab] = useState('bdi')   // 'bdi' | 'freight'

  useEffect(() => {
    apiFetch('/api/bdi/full')
      .then(d => { setBdiData(d); setBdiLoad(false) })
      .catch(() => setBdiLoad(false))
  }, [])

  /* ── Freight forecast chart data (3-point) ── */
  const freightChart = [
    { label:'Now',
      rate: current_spot_rate,
      hi:   current_spot_rate * 1.025,
      lo:   current_spot_rate * 0.975 },
    { label:`+${Math.max(1, Math.ceil(months_to_delivery / 2))}mo`,
      rate: (current_spot_rate + forecast_rate) / 2,
      hi:   (upper_95 + current_spot_rate) / 2,
      lo:   (lower_95 + current_spot_rate) / 2 },
    { label: input.period,
      rate: forecast_rate, hi: upper_95, lo: lower_95 },
  ]

  /* ── BDI chart: slim down to every 3rd point for readability ── */
  const bdiChart = bdiData?.chart_series
    ? bdiData.chart_series.filter((_, i) => i % 3 === 0 || i === bdiData.chart_series.length - 1)
    : []

  return (
    <div className="card" style={{ overflow:'hidden' }}>

      {/* Card header */}
      <div style={{ background:'#003087', padding:'10px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700,
                       textTransform:'uppercase', letterSpacing:'0.1em' }}>
          Freight Rate Forecast
        </span>
        {bdiData && (
          <span style={{ color:'#C8A84B', fontSize:11, fontWeight:600 }}>
            BDI: {bdiData.current_bdi.toLocaleString()} pts
            &nbsp;
            <span style={{ color: bdiData.change_1d >= 0 ? '#81c784' : '#ef9a9a' }}>
              {bdiData.change_1d >= 0 ? '+' : ''}{bdiData.change_1d}
            </span>
          </span>
        )}
      </div>

      <div style={{ padding:16 }}>

        {/* Rate hero row */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
            <div>
              <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Current Spot Rate
              </div>
              <div style={{ fontSize:26, fontWeight:900, color:'#003087', lineHeight:1.1 }}>
                ${current_spot_rate.toFixed(2)}
                <span style={{ fontSize:12, fontWeight:400, color:'#6b7a9e' }}>/MT</span>
              </div>
            </div>
            <div style={{ paddingBottom:3, fontSize:13, fontWeight:700,
                          color: falling ? '#1b5e20' : '#b71c1c' }}>
              {falling ? '▼' : '▲'} {Math.abs(changePct)}%
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'#6b7a9e' }}>Forecast ({input.period})</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#003087' }}>
              ${forecast_rate.toFixed(2)}
              <span style={{ fontSize:11, color:'#6b7a9e' }}>/MT</span>
            </div>
            <div style={{ fontSize:11, color:'#6b7a9e' }}>
              95% band: ${lower_95.toFixed(1)} – ${upper_95.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', borderBottom:'2px solid #eef1fa', marginBottom:12 }}>
          {[
            { id:'bdi',     label:'Baltic Dry Index (BDI)' },
            { id:'freight', label:'Freight Cost Optimisation'},
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding:'6px 14px', fontSize:11, fontWeight:600, border:'none',
                       background:'transparent', cursor:'pointer',
                       color:       activeTab === t.id ? '#003087' : '#6b7a9e',
                       borderBottom: activeTab === t.id ? '2px solid #003087' : '2px solid transparent',
                       marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* BDI Chart */}
        {activeTab === 'bdi' && (
          <>
            {bdiLoad && (
              <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:28, height:28, border:'3px solid #dde3f4', borderTopColor:'#003087',
                              borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              </div>
            )}
            {!bdiLoad && bdiChart.length > 0 && (
              <div style={{ height:160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={bdiChart} margin={{ top:4, right:4, bottom:0, left:0 }}>
                    <defs>
                      <linearGradient id="bdiHistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#003087" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#003087" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="bdiFcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#C8A84B" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#C8A84B" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
                    <XAxis dataKey="date"
                      tick={{ fontSize:9, fill:'#6b7a9e' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => v ? v.slice(5) : ''}
                      interval={Math.floor(bdiChart.length / 6)} />
                    <YAxis
                      tick={{ fontSize:9, fill:'#6b7a9e' }}
                      axisLine={false} tickLine={false}
                      domain={['auto','auto']}
                      tickFormatter={v => v.toLocaleString()} width={45} />
                    <Tooltip content={<BDITooltip />} />

                    {/* Forecast confidence band */}
                    <Area type="monotone" dataKey="upper" stroke="none"
                          fill="#C8A84B" fillOpacity={0.12} name="Upper 95%" legendType="none" />
                    <Area type="monotone" dataKey="lower" stroke="none"
                          fill="white"   fillOpacity={1}    name="Lower 95%" legendType="none" />

                    {/* Historical BDI area */}
                    <Area type="monotone" dataKey="bdi"
                          stroke="#003087" strokeWidth={2}
                          fill="url(#bdiHistGrad)"
                          dot={false} name="BDI"
                          connectNulls={false} />

                    {/* Forecast line */}
                    <Line type="monotone" dataKey="forecast"
                          stroke="#C8A84B" strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={false} name="BDI Forecast"
                          connectNulls={false} />

                    {/* Today reference line */}
                    <ReferenceLine x={bdiChart.find(d => d.type === 'bridge')?.date}
                      stroke="#6b7a9e" strokeDasharray="3 3" strokeWidth={1}
                      label={{ value:'Today', fontSize:9, fill:'#6b7a9e', position:'top' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            {bdiData && (
              <div style={{ display:'flex', gap:16, marginTop:10,
                            paddingTop:10, borderTop:'1px solid #eef1fa' }}>
                <Kpi label="30-Day Change" value={`${bdiData.change_30d_pct > 0 ? '+' : ''}${bdiData.change_30d_pct}%`}
                  color={bdiData.change_30d_pct >= 0 ? '#1b5e20' : '#b71c1c'} />
                <Kpi label="Source" value={bdiData.live_source ? 'Live — tradingeconomics.com' : 'Synthetic (calibrated)'} />
                <Kpi label="Model" value="GARCH(1,1)" />
              </div>
            )}
          </>
        )}

        {/* Freight route forecast chart */}
        {activeTab === 'freight' && (
          <>
            <div style={{ height:160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={freightChart} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <defs>
                    <linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#003087" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#003087" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#6b7a9e' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['auto','auto']} />
                  <Tooltip
                    contentStyle={{ background:'white', border:'1px solid #dde3f4', borderRadius:5, fontSize:11 }}
                    formatter={v => [`$${Number(v).toFixed(2)}/MT`]}
                  />
                  <Area type="monotone" dataKey="hi"   stroke="none" fill="#003087" fillOpacity={0.07} />
                  <Area type="monotone" dataKey="rate" stroke="#003087" strokeWidth={2} fill="url(#fg2)"
                        dot={{ r:4, fill:'#003087', strokeWidth:0 }} name="Freight Rate" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:10,
                          paddingTop:10, borderTop:'1px solid #eef1fa' }}>
              <Kpi label="Route" value={`${input.origin_id} → ${input.port_id}`} />
              <Kpi label="Trend" value={`${falling ? '▼' : '▲'} ${Math.abs(changePct)}%`}
                color={falling ? '#1b5e20' : '#b71c1c'} />
              <Kpi label="Model" value="Holt + GARCH" />
            </div>
          </>
        )}

        <div style={{ fontSize:11, color:'#6b7a9e', marginTop:10, lineHeight:1.6 }}>
          {seasonal_note}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
      <div style={{ fontSize:11, fontWeight:700, color: color || '#1a2340', marginTop:2 }}>{value}</div>
    </div>
  )
}
