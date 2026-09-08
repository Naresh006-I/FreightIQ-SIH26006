import { useState, useEffect } from 'react'
import { apiFetch } from '../config'

const MONTHS  = [{v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},{v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},{v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'}]
const COMS    = ['thermal_coal','coking_coal','iron_ore','limestone','bauxite']
const ORIS    = ['AU','ID','US','MZ','RU']
const ORI_LBL = { AU:'Australia', ID:'Indonesia', US:'USA', MZ:'Mozambique', RU:'Russia' }
const PORTS   = ['INPRD','INVTZ','INGVP','INGPL','INDMA','INHAL']
const PORT_LBL= { INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram', INGPL:'Gopalpur', INDMA:'Dhamra', INHAL:'Haldia' }

const AL = {
  CRITICAL:{ hdrBg:'#b71c1c', cardBg:'#ffebee', border:'#ef9a9a', text:'#b71c1c', bar:'#e53935', icon:'🚨' },
  HIGH:    { hdrBg:'#bf360c', cardBg:'#fff3e0', border:'#ffcc80', text:'#bf360c', bar:'#ffa726', icon:'⚠️' },
  MEDIUM:  { hdrBg:'#e65100', cardBg:'#fff8e1', border:'#ffe082', text:'#e65100', bar:'#ffd54f', icon:'⚡' },
  LOW:     { hdrBg:'#1b5e20', cardBg:'#e8f5e9', border:'#a5d6a7', text:'#1b5e20', bar:'#43a047', icon:'✅' },
}

function Lbl({ c }) { return <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{c}</label> }
function Sel({ value, onChange, children }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'5px 8px', fontSize:11, color:'#1a2340', background:'white', outline:'none' }}>{children}</select>
}

export default function PortIntelligence({ defaultMonth = 11 }) {
  const [month,     setMonth]     = useState(defaultMonth)
  const [intel,     setIntel]     = useState(null)
  const [iLoading,  setIL]        = useState(false)
  const [swForm,    setSwForm]    = useState({ commodity:'thermal_coal', quantity_mt:80000, origin_id:'AU', current_port:'INPRD', target_month:defaultMonth, target_year:2026 })
  const [swResult,  setSwResult]  = useState(null)
  const [swLoading, setSWL]       = useState(false)
  const [swError,   setSwError]   = useState(null)

  useEffect(() => { loadIntel() }, [month])

  async function loadIntel() {
    setIL(true)
    try { setIntel(await apiFetch(`/api/whatif/port-intelligence?month=${month}`)) } catch {}
    finally { setIL(false) }
  }

  async function runSwitch() {
    setSWL(true); setSwError(null)
    try { setSwResult(await apiFetch('/api/whatif/port-switch', { method:'POST', body: JSON.stringify(swForm) })) }
    catch (e) { setSwError(e.message) }
    finally { setSWL(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* ── Section 1: AI Port Intelligence ── */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ background:'#003087', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'0.04em' }}>
              🛰️ AI PORT INTELLIGENCE — EAST COAST INDIA
            </div>
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:3 }}>
              Automated congestion · weather risk · delay cost analysis across all SAIL procurement ports
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>Month:</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ background:'white', border:'1px solid #c4cde3', color:'#003087', fontSize:12, borderRadius:5, padding:'4px 10px', fontWeight:600, outline:'none' }}>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>
        <div style={{ height:3, background:'#C8A84B' }} />

        {iLoading && (
          <div style={{ padding:48, textAlign:'center' }}>
            <div style={{ width:36, height:36, border:'4px solid #dde3f4', borderTopColor:'#003087', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            <div style={{ color:'#6b7a9e', fontSize:13 }}>AI scanning all ports…</div>
          </div>
        )}

        {intel && !iLoading && (
          <div style={{ padding:20, background:'#f8f9fd' }}>
            {/* Summary */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { icon:'🚨', label:'Highest Risk Port',  value: intel.highest_risk_port, color:'#b71c1c' },
                { icon:'🌧️', label:'Monsoon Active',     value: intel.monsoon_active ? 'YES — ACTIVE' : 'NO', color: intel.monsoon_active ? '#0d47a1' : '#1b5e20' },
                { icon:'💸', label:'Avg Delay Cost',     value:`₹${(intel.avg_delay_cost_inr/1_00_000).toFixed(1)}L/vessel` },
                { icon:'⚓', label:'Ports Analysed',     value:`${intel.reports.length} Ports` },
              ].map(t => (
                <div key={t.label} style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color: t.color || '#003087' }}>{t.value}</div>
                </div>
              ))}
            </div>

            {/* Port cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {intel.reports.map(r => {
                const s = AL[r.alert_level] || AL.LOW
                return (
                  <div key={r.port_id} style={{ background:s.cardBg, border:`2px solid ${s.border}`, borderRadius:9, overflow:'hidden' }}>
                    <div style={{ background:s.hdrBg, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ color:'white', fontWeight:700, fontSize:13 }}>{r.port_name}</div>
                        <div style={{ color:'rgba(255,255,255,0.7)', fontSize:10 }}>{r.state}</div>
                      </div>
                      <span style={{ background:'rgba(255,255,255,0.2)', color:'white', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:3 }}>
                        {s.icon} {r.alert_level}
                      </span>
                    </div>
                    <div style={{ padding:12 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                        {[
                          { l:'Congestion',    v:r.congestion.level,   c: r.congestion.level==='HIGH'?'#b71c1c':r.congestion.level==='MEDIUM'?'#e65100':'#1b5e20' },
                          { l:'Weather',       v:r.weather.level,      c: r.weather.level==='HIGH'||r.weather.level==='CRITICAL'?'#b71c1c':r.weather.level==='MEDIUM'?'#e65100':'#1b5e20' },
                          { l:'Max Draft',     v:`${r.max_draft_m}m`,  c:'#003087' },
                          { l:'Vessels Wait',  v:r.congestion.vessels_waiting, c:'#1a2340' },
                          { l:'Avg Wait',      v:`${r.congestion.avg_wait_days}d`, c: r.congestion.avg_wait_days>4?'#b71c1c':'#1a2340' },
                          { l:'Delay Cost',    v:`₹${(r.delay_cost_inr/1_00_000).toFixed(1)}L`, c:'#e65100' },
                        ].map(m => (
                          <div key={m.l} style={{ background:'rgba(255,255,255,0.65)', borderRadius:5, padding:'6px', textAlign:'center' }}>
                            <div style={{ fontSize:9, color:'#6b7a9e', marginBottom:2 }}>{m.l}</div>
                            <div style={{ fontSize:11, fontWeight:700, color:m.c }}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      {/* Berth bar */}
                      <div style={{ marginBottom:8 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:3 }}>
                          <span style={{ color:'#6b7a9e' }}>Berth Efficiency</span>
                          <span style={{ fontWeight:600, color:'#1a2340' }}>{r.berth_efficiency_pct}%</span>
                        </div>
                        <div style={{ background:'rgba(0,0,0,0.1)', borderRadius:3, height:5, overflow:'hidden' }}>
                          <div style={{ height:5, background:s.bar, borderRadius:3, width:`${r.berth_efficiency_pct}%` }} />
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:s.text, fontWeight:500, lineHeight:1.55 }}>💡 {r.ai_insight}</div>
                      {r.silting_risk && (
                        <div style={{ fontSize:10, color:'#e65100', background:'rgba(255,255,255,0.7)', border:'1px solid #ffcc80', borderRadius:4, padding:'4px 8px', marginTop:6 }}>
                          ⚠ River silting risk — confirm tidal window
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Smart Port Switcher ── */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ background:'#003087', padding:'14px 20px' }}>
          <div style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'0.04em' }}>
            🔄 SMART PORT SWITCHER — AI COST COMPARISON
          </div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:3 }}>
            AI ranks all compatible East Coast ports by total landed cost and recommends the optimal destination
          </div>
        </div>
        <div style={{ height:3, background:'#C8A84B' }} />
        <div style={{ padding:20, background:'#f8f9fd', display:'grid', gridTemplateColumns:'320px 1fr', gap:20, alignItems:'start' }}>

          {/* Form */}
          <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:8, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase', letterSpacing:'0.08em', borderBottom:'1px solid #eef1fa', paddingBottom:8 }}>
              Shipment Parameters
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><Lbl c="Commodity" /><Sel value={swForm.commodity} onChange={v=>setSwForm(p=>({...p,commodity:v}))}>{COMS.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}</Sel></div>
              <div><Lbl c="Qty (MT)" /><input type="number" value={swForm.quantity_mt} min={10000} max={500000} step={5000} onChange={e=>setSwForm(p=>({...p,quantity_mt:Number(e.target.value)}))} style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'5px 8px', fontSize:11, outline:'none' }} /></div>
              <div><Lbl c="Origin" /><Sel value={swForm.origin_id} onChange={v=>setSwForm(p=>({...p,origin_id:v}))}>{ORIS.map(o=><option key={o} value={o}>{ORI_LBL[o]}</option>)}</Sel></div>
              <div><Lbl c="Current Port" /><Sel value={swForm.current_port} onChange={v=>setSwForm(p=>({...p,current_port:v}))}>{PORTS.map(p=><option key={p} value={p}>{PORT_LBL[p]}</option>)}</Sel></div>
            </div>
            <button onClick={runSwitch} disabled={swLoading}
              style={{ background: swLoading ? '#9aafd4' : '#003087', color:'white', fontWeight:700, fontSize:12, borderRadius:5, padding:'9px 0', border:'none', cursor: swLoading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {swLoading
                ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Analysing…</>
                : <><span style={{ color:'#C8A84B' }}>▶</span> Analyse Alternate Ports</>}
            </button>
            {swError && <div style={{ fontSize:11, color:'#b71c1c' }}>⚠ {swError}</div>}
          </div>

          {/* Results */}
          {swResult ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Verdict */}
              <div style={{ background: swResult.best_port.port_id !== swResult.current_port.port_id ? '#e3f2fd' : '#e8f5e9',
                            border:`1px solid ${swResult.best_port.port_id !== swResult.current_port.port_id ? '#90caf9' : '#a5d6a7'}`,
                            borderRadius:7, padding:'14px 16px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>AI Verdict</div>
                <div style={{ fontSize:13, color:'#1a2340', lineHeight:1.65 }}>{swResult.ai_recommendation}</div>
                {swResult.saving_vs_current_inr > 0 && (
                  <div style={{ fontSize:20, fontWeight:900, color:'#1b5e20', marginTop:8 }}>
                    ₹{(swResult.saving_vs_current_inr/1_00_000).toFixed(1)} Lakhs savings identified
                  </div>
                )}
              </div>

              {/* Table */}
              <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:8, overflow:'hidden' }}>
                <div style={{ background:'#003087', padding:'8px 14px' }}>
                  <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    Port Cost Comparison — All Compatible Ports
                  </span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>
                        {['Rank','Port','Congestion','Wait','Freight','Total Cost','Saving'].map(h => (
                          <th key={h} style={{ background:'#003087', color:'white', padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {swResult.all_ports.map(p => {
                        const saving = swResult.current_port.total_cost_inr - p.total_cost_inr
                        return (
                          <tr key={p.port_id} style={{ background: p.rank===1 ? '#eff6ff' : p.is_current ? '#fffbeb' : 'white' }}>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa', fontWeight:800, color: p.rank===1 ? '#003087' : '#6b7a9e' }}>#{p.rank}</td>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa' }}>
                              <span style={{ fontWeight:700, color:'#003087' }}>{p.port_name}</span>
                              {p.is_current && <span style={{ marginLeft:6, fontSize:10, background:'#fff8e1', color:'#e65100', border:'1px solid #ffe082', padding:'1px 6px', borderRadius:3 }}>current</span>}
                              {p.rank===1  && <span style={{ marginLeft:6, fontSize:10, background:'#e3f2fd', color:'#0d47a1', border:'1px solid #90caf9', padding:'1px 6px', borderRadius:3 }}>★ optimal</span>}
                            </td>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa', fontWeight:700, color: p.congestion_level==='HIGH'?'#b71c1c':p.congestion_level==='MEDIUM'?'#e65100':'#1b5e20' }}>{p.congestion_level}</td>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa', color:'#6b7a9e' }}>{p.avg_wait_days}d</td>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa', fontWeight:600, color:'#1a2340' }}>${p.freight_rate}/MT</td>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa', fontWeight:700, color:'#003087' }}>₹{(p.total_cost_inr/1_00_000).toFixed(1)}L</td>
                            <td style={{ padding:'9px 12px', borderBottom:'1px solid #eef1fa', fontWeight:700, color: saving>0?'#1b5e20':saving<0?'#b71c1c':'#6b7a9e' }}>
                              {saving > 0 ? `₹${(saving/1_00_000).toFixed(1)}L` : saving < 0 ? `₹${(Math.abs(saving)/1_00_000).toFixed(1)}L more` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            !swLoading && (
              <div style={{ textAlign:'center', padding:'48px 20px', color:'#6b7a9e', fontSize:13 }}>
                Configure parameters and click Analyse to compare all ports
              </div>
            )
          )}
          {swLoading && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <div style={{ width:32, height:32, border:'4px solid #dde3f4', borderTopColor:'#003087', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
