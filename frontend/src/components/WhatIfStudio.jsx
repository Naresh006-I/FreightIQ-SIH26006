/**
 * What-If — Voyage Disruption AI Intelligence (SIH26006)
 *
 * Auto-reads cargo data from Freight Analysis and generates
 * 3 AI disruption scenarios:
 *   1. Weather / Cyclone
 *   2. Seasonal / Monsoon / Port Congestion
 *   3. Technical / Engine Failure
 *
 * For each: shows problem, delay days, cost impact in INR,
 * AI-recommended alternate route, time saved, money saved.
 * User can also manually override any shipment field.
 */

import { useState, useEffect } from 'react'
import { apiFetch } from '../config'

const COMS  = [
  { id:'thermal_coal',label:'Thermal Coal' },
  { id:'coking_coal', label:'Coking Coal'  },
  { id:'iron_ore',    label:'Iron Ore'     },
  { id:'limestone',   label:'Limestone'   },
  { id:'bauxite',     label:'Bauxite'     },
]
const ORIS  = [
  { id:'AU',label:'Australia'     },
  { id:'ID',label:'Indonesia'     },
  { id:'US',label:'United States' },
  { id:'MZ',label:'Mozambique'    },
  { id:'RU',label:'Russia'        },
]
const PORTS = [
  { id:'INPRD',label:'Paradip'       },
  { id:'INVTZ',label:'Visakhapatnam' },
  { id:'INGVP',label:'Gangavaram'    },
  { id:'INGPL',label:'Gopalpur'      },
  { id:'INDMA',label:'Dhamra'        },
  { id:'INHAL',label:'Haldia'        },
  { id:'INCHP',label:'Chennai'       },
]
const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]

const DISRUPTION_ICONS = {
  weather:   'W',
  seasonal:  'S',
  technical: 'T',
}
const DISRUPTION_BG = {
  weather:   { card:'#fff3e0', hdr:'#e65100', badge:'#fff8e1', badgeBdr:'#ffe082', badgeTxt:'#e65100' },
  seasonal:  { card:'#e3f2fd', hdr:'#0d47a1', badge:'#e3f2fd', badgeBdr:'#90caf9', badgeTxt:'#0d47a1' },
  technical: { card:'#f3e5f5', hdr:'#6a1b9a', badge:'#f3e5f5', badgeBdr:'#ce93d8', badgeTxt:'#6a1b9a' },
}

function FieldLbl({ children }) {
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
      style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5,
               padding:'6px 9px', fontSize:12, color:'#1a2340',
               background:'white', outline:'none' }}>
      {children}
    </select>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────────
function RiskBadge({ level, color }) {
  const bg = { CRITICAL:'#7b1fa2', HIGH:'#b71c1c', MEDIUM:'#e65100', LOW:'#1b5e20' }[level] || '#003087'
  return (
    <span style={{ background:bg, color:'white', fontSize:9, fontWeight:800,
                   padding:'2px 7px', borderRadius:3, letterSpacing:'0.05em' }}>
      {level}
    </span>
  )
}

// ── Metric pill ───────────────────────────────────────────────────────────────
function Pill({ label, value, color, bg }) {
  return (
    <div style={{ background: bg || '#f5f7fc', border:`1px solid ${color}30`,
                  borderRadius:6, padding:'8px 12px', textAlign:'center' }}>
      <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                    letterSpacing:'0.06em', marginBottom:3 }}>
        {label}
      </div>
      <div style={{ fontSize:14, fontWeight:800, color: color || '#003087' }}>{value}</div>
    </div>
  )
}

// ── Single disruption scenario card ──────────────────────────────────────────
function ScenarioCard({ sc, expanded, onToggle }) {
  const cfg     = DISRUPTION_BG[sc.type] || DISRUPTION_BG.weather
  const sol     = sc.ai_solution
  const imp     = sc.impact
  const isAlt   = sol.action !== 'MAINTAIN_COURSE'

  return (
    <div style={{ border:`1px solid ${cfg.badgeBdr}`, borderRadius:10,
                  overflow:'hidden', transition:'box-shadow 0.2s',
                  boxShadow: expanded ? '0 4px 16px rgba(0,48,135,0.12)' : '0 1px 4px rgba(0,0,0,0.05)' }}>

      {/* Card header — always visible */}
      <div onClick={onToggle} style={{ background: cfg.hdr, padding:'12px 16px', cursor:'pointer',
                                       display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Icon */}
          <div style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:900, color:'white' }}>
            {DISRUPTION_ICONS[sc.type]}
          </div>
          <div>
            <div style={{ color:'white', fontWeight:800, fontSize:14 }}>{sc.title}</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11, marginTop:2 }}>
              Delay: {imp.delay_days}d &nbsp;|&nbsp;
              Extra cost: Rs.{(imp.extra_cost_inr/1e5).toFixed(1)}L &nbsp;|&nbsp;
              {isAlt ? `Saving available: Rs.${(sol.cost_saving_inr/1e5).toFixed(1)}L` : 'No reroute needed'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <RiskBadge level={sc.severity} />
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:16, fontWeight:300 }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ background: cfg.card }}>

          {/* Problem description */}
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${cfg.badgeBdr}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#1a2340',
                          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>
              Disruption Analysis
            </div>
            <div style={{ fontSize:13, color:'#1a2340', lineHeight:1.7 }}>
              {sc.description}
            </div>
            {/* Risk factors */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
              {imp.risk_factors.map((f, i) => (
                <span key={i} style={{ background:cfg.badge, border:`1px solid ${cfg.badgeBdr}`,
                                        color:cfg.badgeTxt, fontSize:10, fontWeight:600,
                                        padding:'3px 9px', borderRadius:4 }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Impact metrics */}
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${cfg.badgeBdr}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#1a2340',
                          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
              If No Action Taken
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              <Pill label="Delay"         value={`${imp.delay_days} days`}        color="#b71c1c" />
              <Pill label="Extra Cost"    value={`$${(imp.extra_cost_usd/1000).toFixed(0)}k`} color="#e65100" />
              <Pill label="INR Impact"    value={`Rs.${(imp.extra_cost_inr/1e5).toFixed(1)}L`} color="#b71c1c" />
            </div>
          </div>

          {/* AI Solution */}
          <div style={{ padding:'14px 16px', background:'white', borderTop:`2px solid ${cfg.hdr}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <div style={{ width:6, height:24, background: cfg.hdr, borderRadius:3 }} />
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#003087',
                              textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  AI Recommended Solution
                </div>
                <div style={{ fontSize:10, color:'#6b7a9e', marginTop:1 }}>
                  {sol.action.replace(/_/g,' ')}
                </div>
              </div>
              <div style={{ marginLeft:'auto', background: cfg.hdr, color:'white',
                            fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:4 }}>
                {sol.risk_reduction_pct}% RISK REDUCTION
              </div>
            </div>

            {/* Route name */}
            <div style={{ background:'#eff6ff', border:'1px solid #c3d8f5', borderRadius:7,
                          padding:'10px 14px', marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#003087', marginBottom:4 }}>
                {sol.route_name}
              </div>
              <div style={{ fontSize:12, color:'#1a2340', lineHeight:1.6 }}>
                {sol.reason}
              </div>
            </div>

            {/* Solution metrics */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
              <Pill label="Extra NM"      value={sol.extra_nm > 0 ? `+${sol.extra_nm} NM` : 'Same route'} color="#003087" />
              <Pill label="Extra Days"    value={sol.extra_days > 0 ? `+${sol.extra_days}d` : 'No change'} color="#003087" />
              <Pill label="Time Saved"    value={sol.time_saved_days > 0 ? `${sol.time_saved_days}d` : 'Same'}
                                          color="#1b5e20" bg="#e8f5e9" />
              <Pill label="Money Saved"   value={sol.cost_saving_inr > 0 ? `Rs.${(sol.cost_saving_inr/1e5).toFixed(1)}L` : '—'}
                                          color="#1b5e20" bg="#e8f5e9" />
            </div>

            {/* Verdict */}
            <div style={{ background: '#e8f5e9', border:'1px solid #a5d6a7', borderRadius:6,
                          padding:'10px 14px', fontSize:12, fontWeight:600, color:'#1b5e20',
                          lineHeight:1.6 }}>
              AI Verdict: {sc.verdict}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WhatIfStudio({ defaultForm }) {
  const [form, setForm] = useState({
    commodity:    defaultForm?.commodity    || 'thermal_coal',
    quantity_mt:  defaultForm?.quantity_mt  || 80000,
    origin_id:    defaultForm?.origin_id    || 'AU',
    port_id:      defaultForm?.port_id      || 'INPRD',
    target_month: defaultForm?.target_month || 11,
    target_year:  defaultForm?.target_year  || 2026,
    freight_rate: 11.2,
  })

  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [expanded, setExpanded] = useState({ weather:true, seasonal:false, technical:false })

  // Auto-run when defaultForm changes (comes from Freight Analysis)
  useEffect(() => {
    if (defaultForm?.origin_id && defaultForm?.port_id) {
      const merged = {
        commodity:    defaultForm.commodity    || 'thermal_coal',
        quantity_mt:  defaultForm.quantity_mt  || 80000,
        origin_id:    defaultForm.origin_id    || 'AU',
        port_id:      defaultForm.port_id      || 'INPRD',
        target_month: defaultForm.target_month || 11,
        target_year:  defaultForm.target_year  || 2026,
        freight_rate: 11.2,
      }
      setForm(merged)
      runWith(merged)
    }
  // eslint-disable-next-line
  }, [defaultForm?.origin_id, defaultForm?.port_id, defaultForm?.commodity])

  async function runWith(f) {
    setLoading(true); setError(null)
    try {
      const d = await apiFetch('/api/voyage-disruption', { method:'POST', body: JSON.stringify(f) })
      setResult(d)
      // Auto-expand first scenario
      setExpanded({ weather:true, seasonal:false, technical:false })
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function run() { runWith(form) }

  const toggle = (type) => setExpanded(p => ({ ...p, [type]: !p[type] }))

  return (
    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:24, alignItems:'start' }}>

      {/* ── LEFT — voyage config ── */}
      <div className="card" style={{ overflow:'hidden', position:'sticky', top:88 }}>
        <div style={{ background:'#003087', padding:'14px 18px' }}>
          <div style={{ color:'white', fontWeight:800, fontSize:14, letterSpacing:'0.04em' }}>
            WHAT-IF
          </div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, marginTop:3 }}>
            AI Voyage Disruption Intelligence — auto-loaded from Freight Analysis
          </div>
        </div>
        <div style={{ height:3, background:'#C8A84B' }} />

        <div style={{ padding:16, background:'#f8f9fd', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Info banner — shows data source */}
          {defaultForm?.origin_id && (
            <div style={{ background:'#e3f2fd', border:'1px solid #90caf9',
                          borderRadius:6, padding:'8px 12px', fontSize:11, color:'#0d47a1' }}>
              Loaded from Freight Analysis: {defaultForm.origin_id} to {defaultForm.port_id}
            </div>
          )}

          <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7, padding:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase',
                          letterSpacing:'0.07em', borderBottom:'1px solid #eef1fa',
                          paddingBottom:8, marginBottom:12 }}>
              Voyage Parameters
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <FieldLbl>Commodity</FieldLbl>
                <Sel value={form.commodity} onChange={v => setForm(p=>({...p,commodity:v}))}>
                  {COMS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Sel>
              </div>
              <div>
                <FieldLbl>Qty (MT)</FieldLbl>
                <input type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
                  onChange={e => setForm(p=>({...p,quantity_mt:Number(e.target.value)}))}
                  style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5,
                           padding:'6px 8px', fontSize:12, outline:'none' }} />
              </div>
              <div>
                <FieldLbl>Origin</FieldLbl>
                <Sel value={form.origin_id} onChange={v => setForm(p=>({...p,origin_id:v}))}>
                  {ORIS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </Sel>
              </div>
              <div>
                <FieldLbl>Destination</FieldLbl>
                <Sel value={form.port_id} onChange={v => setForm(p=>({...p,port_id:v}))}>
                  {PORTS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Sel>
              </div>
              <div>
                <FieldLbl>Month</FieldLbl>
                <Sel value={form.target_month} onChange={v => setForm(p=>({...p,target_month:Number(v)}))}>
                  {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </Sel>
              </div>
              <div>
                <FieldLbl>Year</FieldLbl>
                <Sel value={form.target_year} onChange={v => setForm(p=>({...p,target_year:Number(v)}))}>
                  {[2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
                </Sel>
              </div>
            </div>
          </div>

          <button onClick={run} disabled={loading}
            style={{ background: loading ? '#9aafd4' : '#003087', color:'white',
                     fontWeight:700, fontSize:13, borderRadius:5, padding:'11px 0',
                     border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading
              ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
                                  borderTopColor:'white', borderRadius:'50%',
                                  animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Analysing…</>
              : <>Run Disruption Analysis</>
            }
          </button>

          {error && <div style={{ fontSize:11, color:'#b71c1c' }}>{error}</div>}
        </div>
      </div>

      {/* ── RIGHT — AI disruption scenarios ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Empty state */}
        {!result && !loading && (
          <div className="card" style={{ padding:'56px 32px', textAlign:'center' }}>
            <div style={{ width:56, height:56, background:'#003087', borderRadius:10,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          margin:'0 auto 18px' }}>
              <svg width="34" height="34" viewBox="0 0 34 34">
                <polygon points="17,2 32,30 2,30" fill="#C8A84B" />
                <polygon points="17,9 27,27 7,27" fill="#003087" />
                <circle cx="17" cy="21" r="3.5" fill="#C8A84B" />
              </svg>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:'#003087', marginBottom:8 }}>
              Voyage Disruption Intelligence
            </div>
            <div style={{ fontSize:13, color:'#6b7a9e', lineHeight:1.7, maxWidth:480, margin:'0 auto' }}>
              The AI analyses your in-transit voyage for Weather, Seasonal, and Technical
              disruption risks — and recommends the optimum alternate route to save
              time and cost for each scenario.
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:20 }}>
              {[
                { l:'W', lbl:'Weather / Cyclone',         c:'#e65100' },
                { l:'S', lbl:'Seasonal / Monsoon',        c:'#0d47a1' },
                { l:'T', lbl:'Technical / Engine Fault',  c:'#6a1b9a' },
              ].map(b => (
                <div key={b.l} style={{ display:'flex', alignItems:'center', gap:7,
                                         background:'#f5f7fc', border:'1px solid #dde3f4',
                                         borderRadius:8, padding:'8px 14px' }}>
                  <div style={{ width:26, height:26, borderRadius:6, background:b.c,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:12, fontWeight:900, color:'white' }}>{b.l}</div>
                  <span style={{ fontSize:12, color:'#1a2340', fontWeight:600 }}>{b.lbl}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card" style={{ padding:'64px', textAlign:'center' }}>
            <div style={{ width:40, height:40, border:'4px solid #dde3f4', borderTopColor:'#003087',
                          borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
            <div style={{ color:'#6b7a9e', fontSize:14 }}>AI scanning voyage for disruption risks…</div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Voyage summary banner */}
            <div className="card" style={{ overflow:'hidden' }}>
              <div style={{ background:'#003087', padding:'11px 18px',
                            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ color:'white', fontWeight:700, fontSize:12,
                               textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Voyage Under Analysis
                </span>
                <span style={{ color:'#C8A84B', fontSize:11, fontWeight:600 }}>
                  {result.voyage_summary.distance_nm.toLocaleString()} NM &nbsp;|&nbsp;
                  {result.voyage_summary.base_days} base days
                </span>
              </div>
              <div style={{ padding:'14px 18px', display:'flex', flexWrap:'wrap', gap:'6px 32px',
                            background:'#f8f9fd' }}>
                {[
                  { l:'Cargo',       v:`${result.voyage_summary.commodity} — ${(result.voyage_summary.quantity_mt/1000).toFixed(0)}k MT` },
                  { l:'Origin',      v: result.voyage_summary.origin },
                  { l:'Destination', v: result.voyage_summary.destination },
                  { l:'Period',      v: result.voyage_summary.period },
                  { l:'Chokepoints', v: result.voyage_summary.chokepoints.length ? result.voyage_summary.chokepoints.join(', ') : 'None' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.l}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#003087', marginTop:1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst case + AI optimum summary */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="card" style={{ padding:'16px 18px', borderLeft:'4px solid #b71c1c' }}>
                <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase',
                              letterSpacing:'0.07em', marginBottom:8 }}>
                  Worst Case (All Disruptions, No Action)
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'#b71c1c' }}>
                  Rs.{(result.worst_case.total_extra_inr/1e5).toFixed(1)}L
                </div>
                <div style={{ fontSize:12, color:'#6b7a9e', marginTop:4 }}>
                  +{result.worst_case.total_delay_days} days &nbsp;|&nbsp;
                  ${(result.worst_case.total_extra_usd/1000).toFixed(0)}k USD extra cost
                </div>
              </div>
              <div className="card" style={{ padding:'16px 18px', borderLeft:'4px solid #1b5e20' }}>
                <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase',
                              letterSpacing:'0.07em', marginBottom:8 }}>
                  AI Optimum (Follow All Recommendations)
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:'#1b5e20' }}>
                  Rs.{(result.ai_optimum.total_saving_inr/1e5).toFixed(1)}L saved
                </div>
                <div style={{ fontSize:12, color:'#6b7a9e', marginTop:4 }}>
                  ${(result.ai_optimum.total_saving_usd/1000).toFixed(0)}k USD saved &nbsp;|&nbsp;
                  @ Rs.{result.ai_optimum.usd_inr_rate}/USD
                </div>
              </div>
            </div>

            {/* AI overall action */}
            <div style={{ background:'#e3f2fd', border:'1px solid #90caf9', borderRadius:8,
                          padding:'12px 16px', fontSize:13, color:'#0d47a1',
                          lineHeight:1.65, fontWeight:500 }}>
              <strong>AI Time &amp; Money Management:</strong> {result.ai_optimum.recommendation}
            </div>

            {/* 3 Disruption scenario cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {result.scenarios.map(sc => (
                <ScenarioCard
                  key={sc.type}
                  sc={sc}
                  expanded={!!expanded[sc.type]}
                  onToggle={() => toggle(sc.type)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
