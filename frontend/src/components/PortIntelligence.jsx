import { useState, useEffect } from 'react'
import { apiFetch } from '../config'

const MONTHS = [
  {v:1,l:'Jan'},{v:2,l:'Feb'},{v:3,l:'Mar'},{v:4,l:'Apr'},
  {v:5,l:'May'},{v:6,l:'Jun'},{v:7,l:'Jul'},{v:8,l:'Aug'},
  {v:9,l:'Sep'},{v:10,l:'Oct'},{v:11,l:'Nov'},{v:12,l:'Dec'},
]

const COMMODITIES = ['thermal_coal','coking_coal','iron_ore','limestone','bauxite']
const ORIGINS     = ['AU','ID','US','MZ','RU']
const ORIGIN_LABELS = {AU:'Australia',ID:'Indonesia',US:'USA',MZ:'Mozambique',RU:'Russia'}

const ALERT_STYLE = {
  CRITICAL: { bg:'bg-red-500/10 border-red-500/40',     text:'text-red-400',    badge:'bg-red-500',     icon:'🚨' },
  HIGH:     { bg:'bg-orange-500/10 border-orange-500/40',text:'text-orange-400', badge:'bg-orange-500',  icon:'⚠️' },
  MEDIUM:   { bg:'bg-yellow-500/10 border-yellow-500/40',text:'text-yellow-400', badge:'bg-yellow-500',  icon:'⚡' },
  LOW:      { bg:'bg-emerald-500/10 border-emerald-500/40',text:'text-emerald-400',badge:'bg-emerald-500',icon:'✅' },
}

export default function PortIntelligence({ defaultMonth = 11 }) {
  const [month, setMonth]           = useState(defaultMonth)
  const [intel, setIntel]           = useState(null)
  const [intelLoading, setIL]       = useState(false)

  // Port switcher state
  const [swForm, setSwForm] = useState({ commodity:'thermal_coal', quantity_mt:80000, origin_id:'AU', current_port:'INPRD', target_month: defaultMonth, target_year:2026 })
  const [swResult, setSwResult]     = useState(null)
  const [swLoading, setSWL]         = useState(false)
  const [swError, setSwError]       = useState(null)

  // Auto-load port intelligence on mount and month change
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
        method: 'POST',
        body: JSON.stringify(swForm),
      }))
    } catch (e) { setSwError(e.message) }
    finally { setSWL(false) }
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: AI Port Intelligence ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🛰️</span> AI Port Intelligence
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatic analysis of congestion, weather risk, and delay costs across all East Coast ports
            </p>
          </div>
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Month:</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none">
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>

        {intelLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">AI scanning all ports…</p>
          </div>
        )}

        {intel && !intelLoading && (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <SummaryTile label="Highest Risk Port" value={intel.highest_risk_port} icon="🚨" />
              <SummaryTile label="Monsoon Active" value={intel.monsoon_active ? 'YES' : 'NO'}
                color={intel.monsoon_active ? 'text-blue-400' : 'text-emerald-400'} icon="🌧️" />
              <SummaryTile label="Avg Delay Cost" value={`₹${(intel.avg_delay_cost_inr/1_00_000).toFixed(1)}L`} icon="💸" />
              <SummaryTile label="Ports Analysed" value={intel.reports.length} icon="⚓" />
            </div>

            {/* Port cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {intel.reports.map(r => {
                const s = ALERT_STYLE[r.alert_level] || ALERT_STYLE.LOW
                return (
                  <div key={r.port_id} className={`border rounded-2xl p-4 ${s.bg}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-200">{r.port_name}</p>
                        <p className="text-xs text-slate-500">{r.state}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-bold ${s.text} border ${s.bg.replace('10','20')} rounded-full px-2 py-0.5`}>
                        {s.icon} {r.alert_level}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <MiniStat label="Congestion" value={r.congestion.level}
                        color={r.congestion.level==='HIGH'?'text-red-400':r.congestion.level==='MEDIUM'?'text-yellow-400':'text-emerald-400'} />
                      <MiniStat label="Weather Risk" value={r.weather.level}
                        color={r.weather.level==='HIGH'||r.weather.level==='CRITICAL'?'text-red-400':r.weather.level==='MEDIUM'?'text-yellow-400':'text-emerald-400'} />
                      <MiniStat label="Vessels Waiting" value={r.congestion.vessels_waiting} />
                      <MiniStat label="Avg Wait" value={`${r.congestion.avg_wait_days}d`} />
                      <MiniStat label="Total Delay" value={`${r.total_delay_days}d`}
                        color={r.total_delay_days > 5 ? 'text-red-400' : 'text-slate-200'} />
                      <MiniStat label="Delay Cost" value={`₹${(r.delay_cost_inr/1_00_000).toFixed(1)}L`}
                        color="text-orange-400" />
                    </div>

                    {/* Berth efficiency bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Berth Efficiency</span>
                        <span className="text-slate-400">{r.berth_efficiency_pct}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${r.berth_efficiency_pct > 70 ? 'bg-emerald-500' : r.berth_efficiency_pct > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${r.berth_efficiency_pct}%` }} />
                      </div>
                    </div>

                    {/* AI insight */}
                    <p className={`text-xs leading-relaxed ${s.text}`}>💡 {r.ai_insight}</p>
                    {r.silting_risk && (
                      <p className="text-xs text-amber-400 mt-1">⚠ River silting risk — confirm tidal window</p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* ── Section 2: Smart Port Switcher ── */}
      <section className="border-t border-slate-800 pt-8">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🔄</span> Smart Port Switcher
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI compares all compatible ports and recommends the lowest-cost alternate destination
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
          {/* Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Commodity">
                <select value={swForm.commodity} onChange={e=>setSwForm(p=>({...p,commodity:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none">
                  {COMMODITIES.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Qty (MT)">
                <input type="number" value={swForm.quantity_mt} min={10000} max={500000} step={5000}
                  onChange={e=>setSwForm(p=>({...p,quantity_mt:Number(e.target.value)}))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none" />
              </FormField>
              <FormField label="Origin">
                <select value={swForm.origin_id} onChange={e=>setSwForm(p=>({...p,origin_id:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none">
                  {ORIGINS.map(o=><option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
                </select>
              </FormField>
              <FormField label="Current Port">
                <select value={swForm.current_port} onChange={e=>setSwForm(p=>({...p,current_port:e.target.value}))}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none">
                  {['INPRD','INVTZ','INGVP','INGPL','INDMA','INHAL'].map(p=>(
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <button onClick={runPortSwitch} disabled={swLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white font-bold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2">
              {swLoading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Analysing…</>
                : <><span>🔄</span> Analyse Alternate Ports</>}
            </button>
            {swError && <p className="text-xs text-red-400">⚠️ {swError}</p>}
          </div>

          {/* Results */}
          {swResult && (
            <div className="space-y-4">
              {/* AI verdict */}
              <div className={`border rounded-2xl p-4 ${swResult.best_port.port_id !== swResult.current_port.port_id
                ? 'bg-sky-500/10 border-sky-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">AI Verdict</p>
                <p className="text-sm text-slate-200 leading-relaxed">{swResult.ai_recommendation}</p>
                {swResult.saving_vs_current_inr > 0 && (
                  <p className="text-emerald-400 font-bold text-base mt-2">
                    ₹{(swResult.saving_vs_current_inr/1_00_000).toFixed(1)}L savings identified
                  </p>
                )}
              </div>

              {/* Port ranking table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Port Cost Comparison</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Rank','Port','Congestion','Wait','Freight','Total Cost','Saving'].map(h => (
                          <th key={h} className="text-left px-4 py-2 text-slate-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {swResult.all_ports.map(p => {
                        const saving = swResult.current_port.total_cost_inr - p.total_cost_inr
                        const isBest = p.rank === 1
                        const isCurrent = p.is_current
                        return (
                          <tr key={p.port_id} className={`border-b border-slate-800/50 ${isBest ? 'bg-sky-500/5' : isCurrent ? 'bg-amber-500/5' : ''}`}>
                            <td className="px-4 py-2.5">
                              <span className={`font-bold ${isBest ? 'text-sky-400' : 'text-slate-400'}`}>
                                #{p.rank}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-slate-200">{p.port_name}</span>
                              {isCurrent && <span className="ml-1 text-amber-400 text-xs">(current)</span>}
                              {isBest && <span className="ml-1 text-sky-400 text-xs">★ best</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={p.congestion_level === 'HIGH' ? 'text-red-400' : p.congestion_level === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'}>
                                {p.congestion_level}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-400">{p.avg_wait_days}d</td>
                            <td className="px-4 py-2.5 text-slate-300">${p.freight_rate}/MT</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-200">
                              ₹{(p.total_cost_inr/1_00_000).toFixed(1)}L
                            </td>
                            <td className="px-4 py-2.5">
                              {saving > 0
                                ? <span className="text-emerald-400 font-bold">₹{(saving/1_00_000).toFixed(1)}L</span>
                                : saving === 0 ? <span className="text-slate-500">—</span>
                                : <span className="text-red-400">₹{(Math.abs(saving)/1_00_000).toFixed(1)}L more</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function SummaryTile({ label, value, icon, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-1">{icon} {label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  )
}
function MiniStat({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-xs font-bold ${color}`}>{value}</p>
    </div>
  )
}
function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
