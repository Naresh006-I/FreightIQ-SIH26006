import { useState } from 'react'
import { apiFetch } from '../config'

const COMS  = [{ id:'thermal_coal',label:'Thermal Coal'},{ id:'coking_coal',label:'Coking Coal'},{ id:'iron_ore',label:'Iron Ore'}]
const ORIS  = [{ id:'AU',label:'Australia'},{ id:'ID',label:'Indonesia'},{ id:'US',label:'USA'},{ id:'MZ',label:'Mozambique'},{ id:'RU',label:'Russia'}]
const PORTS = [{ id:'INPRD',label:'Paradip'},{ id:'INVTZ',label:'Visakhapatnam'},{ id:'INGVP',label:'Gangavaram'},{ id:'INGPL',label:'Gopalpur'},{ id:'INDMA',label:'Dhamra'},{ id:'INHAL',label:'Haldia'}]

const RISK_COLOR = { LOW:'#1b5e20', MEDIUM:'#e65100', HIGH:'#b45309', CRITICAL:'#b71c1c' }
const RISK_BG    = { LOW:'#e8f5e9', MEDIUM:'#fff8e1', HIGH:'#fff3e0',  CRITICAL:'#ffebee' }
const RISK_BORDER= { LOW:'#a5d6a7', MEDIUM:'#ffe082', HIGH:'#ffcc80',  CRITICAL:'#ef9a9a' }

function Lbl({ children }) {
  return (
    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#003087',
                    textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
      {children}
    </label>
  )
}
function Sel({ value, onChange, children }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'6px 8px',
               fontSize:12, color:'#1a2340', background:'white', outline:'none' }}>
      {children}
    </select>
  )
}
function Lever({ label, sub, value, onChange, min, max, step, unit }) {
  const pos = value > 0, neg = value < 0
  return (
    <div style={{ background:'#f5f7fc', border:'1px solid #dde3f4', borderRadius:7, padding:'12px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#1a2340' }}>{label}</div>
          <div style={{ fontSize:10, color:'#6b7a9e', marginTop:2 }}>{sub}</div>
        </div>
        <div style={{
          fontSize:15, fontWeight:900, padding:'2px 8px', borderRadius:4,
          background: pos ? '#ffebee' : neg ? '#e8f5e9' : '#f5f7fc',
          color:       pos ? '#b71c1c' : neg ? '#1b5e20' : '#6b7a9e',
          border:`1px solid ${pos ? '#ef9a9a' : neg ? '#a5d6a7' : '#dde3f4'}`,
        }}>
          {pos ? '+' : ''}{value}{unit}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:'#003087', cursor:'pointer' }} />
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#aab', marginTop:2 }}>
        <span>{min}{unit}</span><span style={{ fontWeight:700, color:'#003087' }}>0</span><span>+{max}{unit}</span>
      </div>
    </div>
  )
}

export default function WhatIfStudio({ defaultForm }) {
  const [form, setForm] = useState({
    commodity: defaultForm?.commodity || 'thermal_coal',
    quantity_mt: defaultForm?.quantity_mt || 80000,
    origin_id: defaultForm?.origin_id || 'AU',
    port_id: defaultForm?.port_id || 'INPRD',
    target_month: defaultForm?.target_month || 11,
    target_year: 2026, contract_months: 6,
  })
  const [levers, setLevers] = useState({ terminal_delay_hrs:0, route_capacity_pct:0, demand_spike_pct:0 })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function run() {
    setLoading(true); setError(null)
    try { setResult(await apiFetch('/api/whatif/simulate', { method:'POST', body: JSON.stringify({ ...form, ...levers }) })) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const rl = result?.risk_level || 'LOW'

  return (
    <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:24, alignItems:'start' }}>

      {/* LEFT — controls */}
      <div className="card" style={{ overflow:'hidden', position:'sticky', top:88 }}>
        <div style={{ background:'#003087', padding:'14px 18px' }}>
          <div style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'0.04em' }}>WHAT-IF SIMULATION STUDIO</div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:3 }}>
            Simulate disruptions · compute cost delta vs baseline
          </div>
        </div>
        <div style={{ height:3, background:'#C8A84B' }} />
        <div style={{ padding:18, background:'#f8f9fd', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Config */}
          <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7, padding:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase',
                          letterSpacing:'0.08em', borderBottom:'1px solid #eef1fa', paddingBottom:8, marginBottom:10 }}>
              Shipment Configuration
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><Lbl>Commodity</Lbl>
                <Sel value={form.commodity} onChange={v => setForm(p=>({...p,commodity:v}))}>
                  {COMS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Sel>
              </div>
              <div><Lbl>Qty (MT)</Lbl>
                <input type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
                  onChange={e => setForm(p=>({...p,quantity_mt:Number(e.target.value)}))}
                  style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'6px 8px', fontSize:12, outline:'none' }} />
              </div>
              <div><Lbl>Origin</Lbl>
                <Sel value={form.origin_id} onChange={v => setForm(p=>({...p,origin_id:v}))}>
                  {ORIS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </Sel>
              </div>
              <div><Lbl>Port</Lbl>
                <Sel value={form.port_id} onChange={v => setForm(p=>({...p,port_id:v}))}>
                  {PORTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Sel>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, height:1, background:'#dde3f4' }} />
            <span style={{ fontSize:10, fontWeight:700, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.08em' }}>Variable Levers</span>
            <div style={{ flex:1, height:1, background:'#dde3f4' }} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Lever label="Global Terminal Delay"   sub="Simulates strike / weather backlog"       value={levers.terminal_delay_hrs} onChange={v => setLevers(p=>({...p,terminal_delay_hrs:v}))} min={-24} max={72}  step={2} unit=" HRS" />
            <Lever label="Route Capacity Slash"    sub="Simulates rake shortages / line failure"  value={levers.route_capacity_pct} onChange={v => setLevers(p=>({...p,route_capacity_pct:v}))} min={-50} max={30}  step={5} unit="%" />
            <Lever label="Plant Demand Spike"      sub="Peak production requirements"             value={levers.demand_spike_pct}   onChange={v => setLevers(p=>({...p,demand_spike_pct:v}))}   min={-30} max={50}  step={2} unit="%" />
          </div>

          <button onClick={run} disabled={loading}
            style={{ background: loading ? '#9aafd4' : '#003087', color:'white', fontWeight:700, fontSize:13,
                     borderRadius:5, padding:'11px 0', border:'none', cursor: loading?'not-allowed':'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading
              ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Running…</>
              : <><span style={{ color:'#C8A84B' }}>▶</span> Run Simulation</>}
          </button>
          {error && <div style={{ fontSize:11, color:'#b71c1c' }}>{error}</div>}
        </div>
      </div>

      {/* RIGHT — results */}
      <div>
        {!result && !loading && (
          <div className="card" style={{ padding:'64px 32px', textAlign:'center' }}>
            <div style={{ width:56, height:56, background:'#003087', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
              <svg width="34" height="34" viewBox="0 0 34 34">
                <polygon points="17,2 32,30 2,30" fill="#C8A84B" />
                <polygon points="17,9 27,27 7,27"  fill="#003087" />
                <circle cx="17" cy="21" r="3.5"   fill="#C8A84B" />
              </svg>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:'#003087', marginBottom:8 }}>What-If Simulation Studio</div>
            <div style={{ fontSize:13, color:'#6b7a9e', lineHeight:1.7, maxWidth:400, margin:'0 auto' }}>
              Adjust the variable levers on the left to simulate disruptions. The AI engine computes cost delta vs your baseline procurement plan instantly.
            </div>
          </div>
        )}

        {loading && (
          <div className="card" style={{ padding:'64px', textAlign:'center' }}>
            <div style={{ width:40, height:40, border:'4px solid #dde3f4', borderTopColor:'#003087', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
            <div style={{ color:'#6b7a9e', fontSize:14 }}>Running simulation engines…</div>
          </div>
        )}

        {result && !loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Comparison banner */}
            <div className="card" style={{ overflow:'hidden', border:`2px solid ${RISK_BORDER[rl]}` }}>
              <div style={{ background:'#003087', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Simulation Result</span>
                <span style={{ background:'rgba(255,255,255,0.2)', color:'white', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:4 }}>
                  RISK: {rl}
                </span>
              </div>
              <div style={{ padding:'18px 20px', background:RISK_BG[rl], display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:16 }}>
                <div style={{ display:'flex', alignItems:'flex-end', gap:40 }}>
                  <div>
                    <div style={{ fontSize:11, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.05em' }}>Baseline Plan</div>
                    <div style={{ fontSize:28, fontWeight:900, color:'#003087' }}>
                      ₹{(result.baseline.total_cost_inr/1_00_000).toFixed(1)}<span style={{ fontSize:14 }}>L</span>
                    </div>
                    <div style={{ fontSize:11, color:'#1b5e20', fontWeight:600 }}>✓ No Disruption</div>
                  </div>
                  <div style={{ fontSize:22, color:'#6b7a9e', paddingBottom:8 }}>→</div>
                  <div>
                    <div style={{ fontSize:11, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.05em' }}>What-If Scenario</div>
                    <div style={{ fontSize:28, fontWeight:900, color:RISK_COLOR[rl] }}>
                      ₹{(result.scenario.total_cost_inr/1_00_000).toFixed(1)}<span style={{ fontSize:14 }}>L</span>
                    </div>
                    <div style={{ fontSize:11, color:RISK_COLOR[rl], fontWeight:600 }}>With Disruptions</div>
                  </div>
                </div>
                <div style={{ background:RISK_COLOR[rl], borderRadius:8, padding:'14px 28px', textAlign:'center', minWidth:130 }}>
                  <div style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>Cost Impact</div>
                  <div style={{ color:'white', fontWeight:900, fontSize:24, marginTop:4 }}>
                    {result.delta.impact_pct > 0 ? '+' : ''}{result.delta.impact_pct}%
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11 }}>
                    ₹{(Math.abs(result.delta.cost_inr)/1_00_000).toFixed(1)}L delta
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {[
                { l:'Baseline Rate',  v:`$${result.baseline.rate_usd_mt}/MT`,  s:'No disruption' },
                { l:'Scenario Rate',  v:`$${result.scenario.rate_usd_mt}/MT`,  s:'With levers',   bold:true },
                { l:'Rate Change',    v:`${result.delta.rate_change>0?'+':''}$${result.delta.rate_change}/MT`, s:'vs baseline',
                  color: result.delta.rate_change > 0 ? '#b71c1c' : '#1b5e20' },
                { l:'Extra Days',     v:`+${result.scenario.extra_days}d`,      s:'Terminal delay' },
              ].map(m => (
                <div key={m.l} className="card" style={{ padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{m.l}</div>
                  <div style={{ fontSize:14, fontWeight:800, color: m.color || (m.bold ? '#003087' : '#1a2340') }}>{m.v}</div>
                  <div style={{ fontSize:10, color:'#6b7a9e', marginTop:3 }}>{m.s}</div>
                </div>
              ))}
            </div>

            {/* Operational Shifts */}
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ background:'#003087', padding:'10px 16px' }}>
                <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  → Operational Shifts (AI-Generated)
                </span>
              </div>
              <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                {result.operational_shifts.map((s, i) => {
                  const modeColor = { 'NO ACTION':{'bg':'#f5f7fc','text':'#6b7a9e','border':'#dde3f4'}, 'VIRTUAL ARRIVAL':{'bg':'#e3f2fd','text':'#0d47a1','border':'#90caf9'}, 'ORIGIN SWITCH':{'bg':'#fff8e1','text':'#e65100','border':'#ffe082'}, 'CONTRACT LOCK':{'bg':'#f3e5f5','text':'#6a1b9a','border':'#ce93d8'} }[s.mode] || {'bg':'#eef1fa','text':'#003087','border':'#c5cde8'}
                  return (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', background:'#f8f9fd', border:'1px solid #dde3f4', borderRadius:6, padding:'10px 12px' }}>
                      <span style={{ background:modeColor.bg, color:modeColor.text, border:`1px solid ${modeColor.border}`, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, flexShrink:0, marginTop:1, whiteSpace:'nowrap' }}>
                        {s.mode}
                      </span>
                      <div>
                        {s.impact_mt > 0 && <div style={{ fontSize:10, color:'#6b7a9e', marginBottom:2 }}>{(s.impact_mt/1000).toFixed(0)}k MT reallocation</div>}
                        <div style={{ fontSize:12, color:'#1a2340' }}>{s.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recommendations */}
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ background:'#003087', padding:'10px 16px' }}>
                <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  AI Recommendations — SAIL Decision Support System
                </span>
              </div>
              <div style={{ padding:16 }}>
                <div style={{ fontSize:13, color:'#1a2340', lineHeight:1.7, marginBottom:12 }}>{result.recommendation}</div>
                {result.risk_level !== 'LOW' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      result.levers_applied.terminal_delay_hrs > 0 && `Activate virtual arrival slow-steaming to absorb ${result.levers_applied.terminal_delay_hrs}h terminal backlog`,
                      result.levers_applied.route_capacity_pct < 0 && 'Diversify origin mix — increase Indonesia allocation by 30% to bypass capacity squeeze',
                      result.levers_applied.demand_spike_pct > 0   && 'Lock 6-month CoA at current rate before demand spike materialises',
                      'Hedge delay penalty with 48h early berth request at destination port',
                    ].filter(Boolean).map((rec, i) => (
                      <div key={i} style={{ display:'flex', gap:8, background:'#e3f2fd', border:'1px solid #90caf9', borderRadius:6, padding:'9px 12px' }}>
                        <span style={{ color:'#C8A84B', flexShrink:0, fontWeight:700 }}>•</span>
                        <span style={{ fontSize:12, color:'#0d47a1' }}>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
