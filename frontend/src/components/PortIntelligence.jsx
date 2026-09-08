import { useState, useEffect } from 'react'
import { apiFetch } from '../config'

const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]
const COMMODITIES = ['thermal_coal','coking_coal','iron_ore','limestone','bauxite']
const ORIGINS     = ['AU','ID','US','MZ','RU']
const ORIGIN_LBL  = {AU:'Australia',ID:'Indonesia',US:'USA',MZ:'Mozambique',RU:'Russia'}
const ALL_PORTS   = ['INPRD','INVTZ','INGVP','INGPL','INDMA','INHAL']
const PORT_LBL    = {INPRD:'Paradip',INVTZ:'Visakhapatnam',INGVP:'Gangavaram',INGPL:'Gopalpur',INDMA:'Dhamra',INHAL:'Haldia'}

const ALERT_STYLE = {
  CRITICAL:{ hdr:'bg-red-700',    bg:'bg-red-50    border-red-300',    text:'text-red-700',    badge:'bg-red-700 text-white',     bar:'bg-red-500',    icon:'🚨' },
  HIGH:    { hdr:'bg-orange-600', bg:'bg-orange-50 border-orange-300', text:'text-orange-700', badge:'bg-orange-500 text-white',   bar:'bg-orange-500', icon:'⚠️' },
  MEDIUM:  { hdr:'bg-yellow-600', bg:'bg-yellow-50 border-yellow-300', text:'text-yellow-700', badge:'bg-yellow-400 text-white',   bar:'bg-yellow-400', icon:'⚡' },
  LOW:     { hdr:'bg-green-700',  bg:'bg-green-50  border-green-300',  text:'text-green-700',  badge:'bg-green-600 text-white',    bar:'bg-green-500',  icon:'✅' },
}

function SailSelect({ value, onChange, children, small }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`sail-input ${small ? 'text-[11px] py-1.5' : 'text-[12px]'}`}>
      {children}
    </select>
  )
}
function FL({ children }) {
  return <label className="block text-[10px] font-bold text-sail-navy uppercase tracking-wider mb-1">{children}</label>
}

export default function PortIntelligence({ defaultMonth = 11 }) {
  const [month, setMonth]           = useState(defaultMonth)
  const [intel, setIntel]           = useState(null)
  const [intelLoading, setIL]       = useState(false)
  const [swForm, setSwForm]         = useState({
    commodity:'thermal_coal', quantity_mt:80000,
    origin_id:'AU', current_port:'INPRD',
    target_month: defaultMonth, target_year:2026,
  })
  const [swResult, setSwResult]     = useState(null)
  const [swLoading, setSWL]         = useState(false)
  const [swError,   setSwError]     = useState(null)

  useEffect(() => { loadIntel() }, [month])

  async function loadIntel() {
    setIL(true)
    try { setIntel(await apiFetch(`/api/whatif/port-intelligence?month=${month}`)) }
    catch {}
    finally { setIL(false) }
  }

  async function runPortSwitch() {
    setSWL(true); setSwError(null)
    try {
      setSwResult(await apiFetch('/api/whatif/port-switch', {
        method: 'POST', body: JSON.stringify(swForm),
      }))
    } catch (e) { setSwError(e.message) }
    finally { setSWL(false) }
  }

  return (
    <div className="space-y-8">

      {/* ═══ SECTION 1 — AI Port Intelligence ═══ */}
      <section className="sail-card overflow-hidden">
        {/* Section header */}
        <div className="bg-sail-navy px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-white text-[15px] tracking-wide">
              🛰️ AI PORT INTELLIGENCE — EAST COAST INDIA
            </h2>
            <p className="text-blue-300 text-[11px] mt-0.5">
              Automated analysis of congestion, weather risk, and delay costs across all SAIL procurement ports
            </p>
          </div>
          {/* Month picker */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-blue-300 text-[11px]">Analysis Month:</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-white border border-blue-400 text-sail-navy text-[12px] rounded px-3 py-1.5 font-semibold outline-none">
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>
        <div className="h-[3px] bg-sail-gold" />

        {intelLoading && (
          <div className="flex items-center justify-center py-16 gap-3 bg-sail-offwhite">
            <div className="w-8 h-8 border-4 border-sail-gray border-t-sail-navy rounded-full animate-spin" />
            <p className="text-sail-muted text-[13px]">AI scanning all ports…</p>
          </div>
        )}

        {intel && !intelLoading && (
          <div className="p-5 bg-sail-offwhite">
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { icon:'🚨', label:'Highest Risk Port', value: intel.highest_risk_port, color:'text-red-700' },
                { icon:'🌧️', label:'Monsoon Active',    value: intel.monsoon_active ? 'YES — ACTIVE' : 'NO', color: intel.monsoon_active?'text-blue-700':'text-green-700' },
                { icon:'💸', label:'Avg Delay Cost',    value: `₹${(intel.avg_delay_cost_inr/1_00_000).toFixed(1)}L / vessel` },
                { icon:'⚓', label:'Ports Analysed',    value: `${intel.reports.length} East Coast Ports` },
              ].map(t => (
                <div key={t.label} className="bg-white border border-sail-gray rounded p-3">
                  <p className="text-[10px] text-sail-muted uppercase tracking-wide mb-1">{t.icon} {t.label}</p>
                  <p className={`text-[13px] font-bold ${t.color || 'text-sail-navy'}`}>{t.value}</p>
                </div>
              ))}
            </div>

            {/* Section divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-sail-gray" />
              <span className="sail-section-title text-[11px]">PORT-WISE ANALYSIS</span>
              <div className="flex-1 h-px bg-sail-gray" />
            </div>

            {/* Port cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {intel.reports.map(r => {
                const s = ALERT_STYLE[r.alert_level] || ALERT_STYLE.LOW
                return (
                  <div key={r.port_id} className={`rounded border-2 overflow-hidden ${s.bg}`}>
                    {/* Card header */}
                    <div className={`${s.hdr} px-3 py-2 flex items-center justify-between`}>
                      <div>
                        <p className="text-white font-bold text-[13px]">{r.port_name}</p>
                        <p className="text-white/70 text-[10px]">{r.state}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 text-white`}>
                        {s.icon} {r.alert_level}
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      {/* 2×3 metrics */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { l:'Congestion',   v: r.congestion.level,     c: r.congestion.level==='HIGH'?'text-red-600':r.congestion.level==='MEDIUM'?'text-yellow-600':'text-green-600' },
                          { l:'Weather',      v: r.weather.level,        c: r.weather.level==='HIGH'||r.weather.level==='CRITICAL'?'text-red-600':r.weather.level==='MEDIUM'?'text-yellow-600':'text-green-600' },
                          { l:'Max Draft',    v: `${r.max_draft_m}m`,    c: 'text-sail-navy' },
                          { l:'Vessels Wait', v: r.congestion.vessels_waiting, c:'text-sail-text' },
                          { l:'Avg Wait',     v: `${r.congestion.avg_wait_days}d`, c: r.congestion.avg_wait_days>4?'text-red-600':'text-sail-text' },
                          { l:'Delay Cost',   v: `₹${(r.delay_cost_inr/1_00_000).toFixed(1)}L`, c:'text-orange-600' },
                        ].map(m => (
                          <div key={m.l} className="bg-white/60 rounded p-1.5 text-center">
                            <p className="text-[9px] text-sail-muted">{m.l}</p>
                            <p className={`text-[11px] font-bold ${m.c}`}>{m.v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Berth efficiency bar */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-sail-muted">Berth Efficiency</span>
                          <span className="text-sail-text font-semibold">{r.berth_efficiency_pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${s.bar}`} style={{width:`${r.berth_efficiency_pct}%`}} />
                        </div>
                      </div>

                      {/* AI insight */}
                      <p className={`text-[11px] leading-relaxed font-medium ${s.text}`}>💡 {r.ai_insight}</p>
                      {r.silting_risk && (
                        <p className="text-[10px] text-orange-700 bg-orange-50 rounded px-2 py-1 border border-orange-200">
                          ⚠ River silting risk — confirm tidal window before berthing
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ═══ SECTION 2 — Smart Port Switcher ═══ */}
      <section className="sail-card overflow-hidden">
        <div className="bg-sail-navy px-5 py-4">
          <h2 className="font-heading font-bold text-white text-[15px] tracking-wide">
            🔄 SMART PORT SWITCHER — AI COST COMPARISON
          </h2>
          <p className="text-blue-300 text-[11px] mt-0.5">
            AI ranks all compatible East Coast ports by total landed cost and recommends the optimal destination
          </p>
        </div>
        <div className="h-[3px] bg-sail-gold" />

        <div className="p-5 bg-sail-offwhite">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

            {/* Form */}
            <div className="bg-white border border-sail-gray rounded p-4 space-y-3">
              <p className="text-[11px] font-bold text-sail-navy uppercase tracking-widest border-b border-sail-gray pb-2">
                Shipment Parameters
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div><FL>Commodity</FL>
                  <SailSelect value={swForm.commodity} onChange={v=>setSwForm(p=>({...p,commodity:v}))} small>
                    {COMMODITIES.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}
                  </SailSelect>
                </div>
                <div><FL>Qty (MT)</FL>
                  <input type="number" value={swForm.quantity_mt} min={10000} max={500000} step={5000}
                    onChange={e=>setSwForm(p=>({...p,quantity_mt:Number(e.target.value)}))}
                    className="sail-input text-[11px]" />
                </div>
                <div><FL>Origin</FL>
                  <SailSelect value={swForm.origin_id} onChange={v=>setSwForm(p=>({...p,origin_id:v}))} small>
                    {ORIGINS.map(o=><option key={o} value={o}>{ORIGIN_LBL[o]}</option>)}
                  </SailSelect>
                </div>
                <div><FL>Current Port</FL>
                  <SailSelect value={swForm.current_port} onChange={v=>setSwForm(p=>({...p,current_port:v}))} small>
                    {ALL_PORTS.map(p=><option key={p} value={p}>{PORT_LBL[p]}</option>)}
                  </SailSelect>
                </div>
              </div>
              <button onClick={runPortSwitch} disabled={swLoading}
                className="w-full sail-btn-primary py-2.5 flex items-center justify-center gap-2 text-[12px] disabled:opacity-50">
                {swLoading
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Analysing…</>
                  : <><span className="text-sail-gold">▶</span> Analyse Alternate Ports</>}
              </button>
              {swError && <p className="text-[11px] text-red-600">⚠ {swError}</p>}
            </div>

            {/* Results */}
            {swResult ? (
              <div className="space-y-4">
                {/* AI verdict */}
                <div className={`rounded border-2 p-4 ${swResult.best_port.port_id !== swResult.current_port.port_id
                  ? 'bg-blue-50 border-sail-navy' : 'bg-green-50 border-green-400'}`}>
                  <p className="text-[10px] font-bold text-sail-navy uppercase tracking-widest mb-1">AI Verdict</p>
                  <p className="text-[13px] text-sail-text leading-relaxed">{swResult.ai_recommendation}</p>
                  {swResult.saving_vs_current_inr > 0 && (
                    <p className="text-green-700 font-black text-xl mt-2">
                      ₹{(swResult.saving_vs_current_inr/1_00_000).toFixed(1)} Lakhs savings identified
                    </p>
                  )}
                </div>

                {/* Comparison table */}
                <div className="bg-white border border-sail-gray rounded overflow-hidden">
                  <div className="bg-sail-navy px-4 py-2">
                    <p className="text-white text-[11px] font-bold uppercase tracking-widest">Port Cost Comparison — All Compatible Ports</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full sail-table">
                      <thead>
                        <tr>
                          {['Rank','Port','State','Congestion','Avg Wait','Freight Rate','Total Cost','Saving vs Current'].map(h=>(
                            <th key={h} className="text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {swResult.all_ports.map(p => {
                          const saving  = swResult.current_port.total_cost_inr - p.total_cost_inr
                          const isBest  = p.rank === 1
                          const isCurr  = p.is_current
                          return (
                            <tr key={p.port_id} className={isBest ? 'bg-blue-50' : isCurr ? 'bg-yellow-50' : ''}>
                              <td>
                                <span className={`font-black text-[13px] ${isBest?'text-sail-navy':'text-sail-muted'}`}>
                                  #{p.rank}
                                </span>
                              </td>
                              <td>
                                <span className="font-bold text-sail-navy">{p.port_name}</span>
                                {isCurr && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-300">current</span>}
                                {isBest && <span className="ml-1 text-[10px] bg-blue-100 text-sail-navy px-1.5 py-0.5 rounded border border-blue-300">★ optimal</span>}
                              </td>
                              <td className="text-sail-muted">{p.state}</td>
                              <td>
                                <span className={`font-semibold ${p.congestion_level==='HIGH'?'text-red-600':p.congestion_level==='MEDIUM'?'text-yellow-600':'text-green-600'}`}>
                                  {p.congestion_level}
                                </span>
                              </td>
                              <td>{p.avg_wait_days}d</td>
                              <td className="font-semibold text-sail-navy">${p.freight_rate}/MT</td>
                              <td className="font-bold text-sail-navy">₹{(p.total_cost_inr/1_00_000).toFixed(1)}L</td>
                              <td>
                                {saving > 0
                                  ? <span className="text-green-700 font-bold">₹{(saving/1_00_000).toFixed(1)}L</span>
                                  : saving === 0
                                  ? <span className="text-sail-muted">—</span>
                                  : <span className="text-red-600 font-bold">₹{(Math.abs(saving)/1_00_000).toFixed(1)}L more</span>}
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-sail-navy rounded flex items-center justify-center mb-3">
                    <span className="text-sail-gold font-black">⚓</span>
                  </div>
                  <p className="text-sail-muted text-[13px]">Configure shipment parameters and click Analyse to compare all ports</p>
                </div>
              )
            )}
            {swLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-sail-gray border-t-sail-navy rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
