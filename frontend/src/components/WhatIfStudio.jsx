import { useState } from 'react'
import { apiFetch } from '../config'

const COMMODITIES = [
  { id: 'thermal_coal', label: 'Thermal Coal' },
  { id: 'coking_coal',  label: 'Coking Coal'  },
  { id: 'iron_ore',     label: 'Iron Ore'      },
]
const ORIGINS = [
  { id: 'AU', label: 'Australia'     },
  { id: 'ID', label: 'Indonesia'     },
  { id: 'US', label: 'United States' },
  { id: 'MZ', label: 'Mozambique'    },
  { id: 'RU', label: 'Russia'        },
]
const PORTS = [
  { id: 'INPRD', label: 'Paradip'       },
  { id: 'INVTZ', label: 'Visakhapatnam' },
  { id: 'INGVP', label: 'Gangavaram'    },
  { id: 'INGPL', label: 'Gopalpur'      },
  { id: 'INDMA', label: 'Dhamra'        },
  { id: 'INHAL', label: 'Haldia'        },
]

const RISK_STYLE = {
  LOW:      { bg: 'bg-green-50  border-green-300',  text: 'text-green-700',  badge: 'bg-green-600'  },
  MEDIUM:   { bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-500' },
  HIGH:     { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700', badge: 'bg-orange-500' },
  CRITICAL: { bg: 'bg-red-50    border-red-300',    text: 'text-red-700',    badge: 'bg-red-600'    },
}

function SailSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="sail-input text-[12px]">
      {children}
    </select>
  )
}

function FieldLabel({ children }) {
  return <label className="block text-[10px] font-bold text-sail-navy uppercase tracking-wider mb-1">{children}</label>
}

function Slider({ label, sublabel, value, onChange, min, max, step = 1, unit }) {
  const pct = ((value - min) / (max - min)) * 100
  const isPos = value > 0
  const isNeg = value < 0
  return (
    <div className="bg-sail-offwhite border border-sail-gray rounded p-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[12px] font-bold text-sail-navy">{label}</p>
          <p className="text-[10px] text-sail-muted">{sublabel}</p>
        </div>
        <span className={`text-[15px] font-black px-2 py-0.5 rounded ${
          isPos ? 'bg-red-100 text-red-700' : isNeg ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-sail-muted'
        }`}>
          {isPos ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200"
        style={{ accentColor: '#003087' }}
      />
      <div className="flex justify-between text-[10px] text-sail-muted mt-1">
        <span>{min}{unit}</span>
        <span className="font-semibold text-sail-navy">0{unit}</span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  )
}

export default function WhatIfStudio({ defaultForm }) {
  const [form, setForm] = useState({
    commodity:       defaultForm?.commodity || 'thermal_coal',
    quantity_mt:     defaultForm?.quantity_mt || 80000,
    origin_id:       defaultForm?.origin_id || 'AU',
    port_id:         defaultForm?.port_id || 'INPRD',
    target_month:    defaultForm?.target_month || 11,
    target_year:     2026,
    contract_months: 6,
  })
  const [levers, setLevers] = useState({
    terminal_delay_hrs: 0,
    route_capacity_pct: 0,
    demand_spike_pct:   0,
  })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  function setL(k, v) { setLevers(p => ({ ...p, [k]: v })) }

  async function runSim() {
    setLoading(true); setError(null)
    try {
      setResult(await apiFetch('/api/whatif/simulate', {
        method: 'POST', body: JSON.stringify({ ...form, ...levers }),
      }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const rs = result ? RISK_STYLE[result.risk_level] || RISK_STYLE.LOW : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

      {/* ── LEFT PANEL — Variable Levers ── */}
      <div className="sail-card overflow-hidden lg:sticky lg:top-[88px]">
        {/* Panel header */}
        <div className="bg-sail-navy px-5 py-4">
          <h2 className="font-heading font-bold text-white text-[15px] tracking-wide">WHAT-IF SIMULATION STUDIO</h2>
          <p className="text-blue-300 text-[11px] mt-0.5">Simulate disruption scenarios — compute cost delta vs baseline</p>
        </div>
        <div className="h-[3px] bg-sail-gold" />

        <div className="p-5 space-y-4 bg-sail-offwhite">

          {/* Shipment Config */}
          <div className="bg-white border border-sail-gray rounded p-3">
            <p className="text-[10px] font-bold text-sail-navy uppercase tracking-widest mb-3">Shipment Configuration</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Commodity</FieldLabel>
                <SailSelect value={form.commodity} onChange={v => setForm(p=>({...p,commodity:v}))}>
                  {COMMODITIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </SailSelect>
              </div>
              <div>
                <FieldLabel>Qty (MT)</FieldLabel>
                <input type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
                  onChange={e=>setForm(p=>({...p,quantity_mt:Number(e.target.value)}))}
                  className="sail-input text-[12px]" />
              </div>
              <div>
                <FieldLabel>Origin</FieldLabel>
                <SailSelect value={form.origin_id} onChange={v=>setForm(p=>({...p,origin_id:v}))}>
                  {ORIGINS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
                </SailSelect>
              </div>
              <div>
                <FieldLabel>Destination Port</FieldLabel>
                <SailSelect value={form.port_id} onChange={v=>setForm(p=>({...p,port_id:v}))}>
                  {PORTS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                </SailSelect>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-sail-gray" />
            <span className="text-[10px] font-bold text-sail-navy uppercase tracking-widest">Variable Levers</span>
            <div className="flex-1 h-px bg-sail-gray" />
          </div>

          {/* Levers */}
          <div className="space-y-3">
            <Slider
              label="Global Terminal Delay"
              sublabel="Simulates strike / weather backlog"
              value={levers.terminal_delay_hrs}
              onChange={v => setL('terminal_delay_hrs', v)}
              min={-24} max={72} step={2} unit=" HRS"
            />
            <Slider
              label="Route Capacity Slash"
              sublabel="Simulates rake shortages / line failure"
              value={levers.route_capacity_pct}
              onChange={v => setL('route_capacity_pct', v)}
              min={-50} max={30} step={5} unit="%"
            />
            <Slider
              label="Plant Demand Spike"
              sublabel="Peak production requirements"
              value={levers.demand_spike_pct}
              onChange={v => setL('demand_spike_pct', v)}
              min={-30} max={50} step={2} unit="%"
            />
          </div>

          {/* Run button */}
          <button onClick={runSim} disabled={loading}
            className="w-full sail-btn-primary py-3 flex items-center justify-center gap-2 text-[13px] disabled:opacity-50">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Running Simulation…</>
              : <><span className="text-sail-gold">▶</span> Run Simulation</>}
          </button>
          {error && <p className="text-[11px] text-red-600">⚠ {error}</p>}
        </div>
      </div>

      {/* ── RIGHT PANEL — Results ── */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="sail-card p-12 text-center">
            <div className="mb-4">
              {/* Mini SAIL logo placeholder */}
              <div className="w-16 h-16 bg-sail-navy rounded mx-auto flex items-center justify-center">
                <span className="text-sail-gold text-2xl font-black">S</span>
              </div>
            </div>
            <h3 className="text-[17px] font-bold text-sail-navy font-heading uppercase tracking-wide">
              What-If Simulation Studio
            </h3>
            <p className="text-sail-muted text-[13px] mt-2 max-w-md mx-auto leading-relaxed">
              Adjust the variable levers to simulate disruptions — terminal delays, route capacity cuts, or demand spikes.
              The AI engine computes the cost delta against your baseline procurement plan.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['Terminal Delay','Route Capacity','Demand Spike','Cost Impact','Risk Assessment'].map(t => (
                <span key={t} className="text-[11px] bg-sail-offwhite border border-sail-gray text-sail-muted px-3 py-1 rounded">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="sail-card p-16 text-center">
            <div className="w-12 h-12 border-4 border-sail-gray border-t-sail-navy rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sail-muted text-[13px]">Running simulation engines…</p>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Comparison banner */}
            <div className={`sail-card overflow-hidden border-2 ${rs.bg}`}>
              <div className="bg-sail-navy px-5 py-2 flex items-center justify-between">
                <span className="text-white text-[11px] font-bold uppercase tracking-widest">Simulation Result</span>
                <span className={`text-[11px] font-bold text-white bg-white/20 px-2 py-0.5 rounded`}>
                  RISK: {result.risk_level}
                </span>
              </div>
              <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-end gap-8">
                  <div>
                    <p className="text-[11px] text-sail-muted uppercase tracking-wide">Baseline Plan</p>
                    <p className="text-3xl font-black text-sail-navy">
                      ₹{(result.baseline.total_cost_inr/1_00_000).toFixed(1)}<span className="text-lg">L</span>
                    </p>
                    <p className="text-[11px] text-green-600 font-semibold">✓ No Disruption</p>
                  </div>
                  <div className="text-sail-muted text-2xl pb-2">→</div>
                  <div>
                    <p className="text-[11px] text-sail-muted uppercase tracking-wide">What-If Scenario</p>
                    <p className={`text-3xl font-black ${rs.text}`}>
                      ₹{(result.scenario.total_cost_inr/1_00_000).toFixed(1)}<span className="text-lg">L</span>
                    </p>
                    <p className={`text-[11px] font-semibold ${rs.text}`}>⚠ With Disruptions</p>
                  </div>
                </div>
                <div className={`${rs.badge} rounded px-6 py-3 text-center min-w-[130px]`}>
                  <p className="text-white text-[11px] font-semibold uppercase tracking-wide">Cost Impact</p>
                  <p className="text-white text-2xl font-black mt-1">
                    {result.delta.impact_pct > 0 ? '+' : ''}{result.delta.impact_pct}%
                  </p>
                  <p className="text-white/80 text-[11px]">₹{Math.abs(result.delta.cost_inr/1_00_000).toFixed(1)}L delta</p>
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'Baseline Rate',  value:`$${result.baseline.rate_usd_mt}/MT`,   sub:'No disruption' },
                { label:'Scenario Rate',  value:`$${result.scenario.rate_usd_mt}/MT`,   sub:'With levers',  bold: true },
                { label:'Rate Change',    value:`${result.delta.rate_change>0?'+':''}$${result.delta.rate_change}/MT`, sub:'vs baseline', color: result.delta.rate_change>0?'text-red-600':'text-green-600' },
                { label:'Extra Days',     value:`+${result.scenario.extra_days}d`,       sub:'Terminal delay' },
              ].map(m => (
                <div key={m.label} className="sail-card p-3 text-center">
                  <p className="text-[10px] text-sail-muted uppercase tracking-wide mb-1">{m.label}</p>
                  <p className={`text-[14px] font-bold ${m.color || (m.bold ? 'text-sail-navy' : 'text-sail-text')}`}>{m.value}</p>
                  <p className="text-[10px] text-sail-muted">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Operational Shifts */}
            <div className="sail-card overflow-hidden">
              <div className="bg-sail-navy px-4 py-2.5">
                <p className="text-white text-[12px] font-bold uppercase tracking-widest">→ Operational Shifts (AI-Generated)</p>
              </div>
              <div className="p-4 space-y-2">
                {result.operational_shifts.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 bg-sail-offwhite border border-sail-gray rounded p-3">
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 border ${
                      s.mode==='NO ACTION'      ? 'bg-gray-100 text-gray-600 border-gray-300' :
                      s.mode==='VIRTUAL ARRIVAL'? 'bg-blue-100 text-sail-navy border-blue-300' :
                      s.mode==='ORIGIN SWITCH'  ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      'bg-sail-navy text-white border-sail-navy'
                    }`}>{s.mode}</span>
                    <div>
                      {s.impact_mt > 0 && (
                        <p className="text-[10px] text-sail-muted mb-0.5">{(s.impact_mt/1000).toFixed(0)}k MT reallocation</p>
                      )}
                      <p className="text-[12px] text-sail-text">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="sail-card overflow-hidden">
              <div className="bg-sail-navy px-4 py-2.5">
                <p className="text-white text-[12px] font-bold uppercase tracking-widest">AI Recommendations — SAIL Decision Support</p>
              </div>
              <div className="p-4">
                <p className="text-[13px] text-sail-text leading-relaxed mb-3">{result.recommendation}</p>
                {result.risk_level !== 'LOW' && (
                  <div className="space-y-2">
                    {result.levers_applied.terminal_delay_hrs > 0 && (
                      <Rec text={`Activate virtual arrival slow-steaming to absorb ${result.levers_applied.terminal_delay_hrs}h terminal backlog`} />
                    )}
                    {result.levers_applied.route_capacity_pct < 0 && (
                      <Rec text="Diversify origin mix — increase Indonesia allocation by 30% to bypass capacity squeeze" />
                    )}
                    {result.levers_applied.demand_spike_pct > 0 && (
                      <Rec text="Lock 6-month CoA at current rate before demand spike materialises" />
                    )}
                    <Rec text="Hedge delay penalty with 48h early berth request at destination port" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Rec({ text }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded p-2.5">
      <span className="text-sail-gold flex-shrink-0 mt-0.5">•</span>
      <p className="text-[12px] text-sail-navy">{text}</p>
    </div>
  )
}
