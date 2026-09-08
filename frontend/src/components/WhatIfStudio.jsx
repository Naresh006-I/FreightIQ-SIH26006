import { useState } from 'react'

const COMMODITIES = [
  { id: 'thermal_coal', label: 'Thermal Coal' },
  { id: 'coking_coal',  label: 'Coking Coal'  },
  { id: 'iron_ore',     label: 'Iron Ore'      },
]
const ORIGINS = [
  { id: 'AU', label: '🇦🇺 Australia' },
  { id: 'ID', label: '🇮🇩 Indonesia' },
  { id: 'US', label: '🇺🇸 USA' },
  { id: 'MZ', label: '🇲🇿 Mozambique' },
  { id: 'RU', label: '🇷🇺 Russia' },
]
const PORTS = [
  { id: 'INPRD', label: 'Paradip' },
  { id: 'INVTZ', label: 'Visakhapatnam' },
  { id: 'INGVP', label: 'Gangavaram' },
  { id: 'INGPL', label: 'Gopalpur' },
  { id: 'INDMA', label: 'Dhamra' },
  { id: 'INHAL', label: 'Haldia' },
]

function Slider({ label, sublabel, value, onChange, min, max, step = 1, unit, color }) {
  const pct = ((value - min) / (max - min)) * 100
  const colorMap = {
    orange: 'accent-orange-500',
    red:    'accent-red-500',
    blue:   'accent-blue-500',
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-200">{label}</p>
          <p className="text-xs text-slate-500">{sublabel}</p>
        </div>
        <span className={`text-lg font-black ${value > 0 ? 'text-orange-400' : value < 0 ? 'text-sky-400' : 'text-slate-400'}`}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-full bg-slate-700 appearance-none cursor-pointer ${colorMap[color] || 'accent-sky-500'}`}
      />
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>{min}{unit}</span>
        <span>0{unit}</span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  )
}

const RISK_STYLE = {
  LOW:      { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  MEDIUM:   { bg: 'bg-yellow-500/10 border-yellow-500/30',  text: 'text-yellow-400',  badge: 'bg-yellow-500' },
  HIGH:     { bg: 'bg-orange-500/10 border-orange-500/30',  text: 'text-orange-400',  badge: 'bg-orange-500' },
  CRITICAL: { bg: 'bg-red-500/10 border-red-500/30',        text: 'text-red-400',     badge: 'bg-red-500' },
}

export default function WhatIfStudio({ defaultForm }) {
  const [form, setForm] = useState({
    commodity: defaultForm?.commodity || 'thermal_coal',
    quantity_mt: defaultForm?.quantity_mt || 80000,
    origin_id: defaultForm?.origin_id || 'AU',
    port_id: defaultForm?.port_id || 'INPRD',
    target_month: defaultForm?.target_month || 11,
    target_year: defaultForm?.target_year || 2026,
    contract_months: 6,
  })
  const [levers, setLevers] = useState({
    terminal_delay_hrs: 0,
    route_capacity_pct: 0,
    demand_spike_pct: 0,
  })
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function setL(k, v) { setLevers(p => ({ ...p, [k]: v })) }

  async function runSim() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/whatif/simulate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...levers }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setResult(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const riskStyle = result ? RISK_STYLE[result.risk_level] || RISK_STYLE.LOW : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

      {/* LEFT — Variable Levers Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 lg:sticky lg:top-20">
        {/* Header */}
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🔬</span>
            <h2 className="text-base font-bold text-white">What-If Studio</h2>
          </div>
          <p className="text-xs text-slate-500">Simulate disruption scenarios and see the cost impact in real-time</p>
        </div>

        {/* Shipment config */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Commodity</label>
            <select value={form.commodity} onChange={e => setForm(p=>({...p,commodity:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-sky-500">
              {COMMODITIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quantity MT</label>
            <input type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
              onChange={e=>setForm(p=>({...p,quantity_mt:Number(e.target.value)}))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Origin</label>
            <select value={form.origin_id} onChange={e=>setForm(p=>({...p,origin_id:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-sky-500">
              {ORIGINS.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Port</label>
            <select value={form.port_id} onChange={e=>setForm(p=>({...p,port_id:e.target.value}))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-sky-500">
              {PORTS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">⚙️ Variable Levers</p>
          <div className="space-y-6">
            <Slider
              label="Global Terminal Delay"
              sublabel="Simulates strike / weather backlog"
              value={levers.terminal_delay_hrs}
              onChange={v => setL('terminal_delay_hrs', v)}
              min={-24} max={72} step={2} unit=" HRS" color="orange"
            />
            <Slider
              label="Route Capacity Slash"
              sublabel="Simulates rake shortages / line failure"
              value={levers.route_capacity_pct}
              onChange={v => setL('route_capacity_pct', v)}
              min={-50} max={30} step={5} unit="%" color="red"
            />
            <Slider
              label="Plant Demand Spike"
              sublabel="Peak production requirements"
              value={levers.demand_spike_pct}
              onChange={v => setL('demand_spike_pct', v)}
              min={-30} max={50} step={2} unit="%" color="blue"
            />
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runSim} disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm rounded-xl py-3 transition-all flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running…</>
            : <><span>🧪</span> Run Simulation</>
          }
        </button>

        {error && <p className="text-xs text-red-400">⚠️ {error}</p>}
      </div>

      {/* RIGHT — Results */}
      <div className="space-y-5">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <span className="text-5xl">🧪</span>
            <h3 className="text-lg font-bold text-slate-300">What-If Studio</h3>
            <p className="text-slate-500 text-sm max-w-md">
              Adjust the variable levers to simulate disruptions — terminal delays, route capacity cuts, demand spikes.
              The AI computes the cost delta vs your baseline plan instantly.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
              <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
            </div>
            <p className="text-slate-400 text-sm">Running simulation engines…</p>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Top comparison bar */}
            <div className={`border rounded-2xl p-5 ${riskStyle.bg}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Simulation Result</p>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Baseline Plan</p>
                      <p className="text-2xl font-black text-slate-200">
                        ₹{(result.baseline.total_cost_inr/1_00_000).toFixed(1)}L
                      </p>
                      <p className="text-xs text-emerald-400">✓ {result.baseline.label}</p>
                    </div>
                    <div className="text-slate-600 text-xl pb-1">→</div>
                    <div>
                      <p className="text-xs text-slate-400">What-If Scenario</p>
                      <p className={`text-2xl font-black ${riskStyle.text}`}>
                        ₹{(result.scenario.total_cost_inr/1_00_000).toFixed(1)}L
                      </p>
                      <p className={`text-xs font-semibold ${riskStyle.text}`}>
                        RISK: {result.risk_level}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${riskStyle.badge} rounded-2xl px-5 py-3 text-center min-w-[130px]`}>
                  <p className="text-white text-xs font-semibold uppercase">Cost Impact</p>
                  <p className="text-white text-2xl font-black mt-1">
                    {result.delta.impact_pct > 0 ? '+' : ''}{result.delta.impact_pct}%
                  </p>
                  <p className="text-white/70 text-xs">
                    ₹{Math.abs(result.delta.cost_inr/1_00_000).toFixed(1)}L delta
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricBox label="Baseline Rate" value={`$${result.baseline.rate_usd_mt}/MT`} sub="No disruption" />
              <MetricBox label="Scenario Rate" value={`$${result.scenario.rate_usd_mt}/MT`} sub="With levers" color={riskStyle.text} />
              <MetricBox label="Rate Change" value={`${result.delta.rate_change > 0 ? '+' : ''}$${result.delta.rate_change}/MT`}
                sub="vs baseline" color={result.delta.rate_change > 0 ? 'text-red-400' : 'text-emerald-400'} />
              <MetricBox label="Extra Days" value={`+${result.scenario.extra_days}d`} sub="Terminal delay" />
            </div>

            {/* Operational Shifts */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-200 mb-4">→ Operational Shifts (AI-Generated)</p>
              <div className="space-y-3">
                {result.operational_shifts.map((s, i) => (
                  <div key={i} className="bg-slate-800/60 rounded-xl p-3 flex items-start gap-3">
                    <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      s.mode === 'NO ACTION' ? 'bg-slate-700 text-slate-400' :
                      s.mode === 'VIRTUAL ARRIVAL' ? 'bg-sky-500/20 text-sky-400' :
                      s.mode === 'ORIGIN SWITCH' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-violet-500/20 text-violet-400'
                    }`}>{s.mode}</span>
                    <div>
                      {s.impact_mt > 0 && (
                        <p className="text-xs text-slate-500 mb-0.5">{(s.impact_mt/1000).toFixed(0)}k MT shift</p>
                      )}
                      <p className="text-xs text-slate-300">{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">🤖 AI Recommendations</p>
              <p className="text-sm text-slate-300 leading-relaxed">{result.recommendation}</p>
              {result.risk_level !== 'LOW' && (
                <div className="mt-3 space-y-1.5">
                  {result.delta.rate_change > 0 && (
                    <BulletRec text="Hedge delay penalty with 48h early berth request" />
                  )}
                  {result.levers_applied.terminal_delay_hrs > 0 && (
                    <BulletRec text={`Activate virtual arrival slow-steaming to absorb ${result.levers_applied.terminal_delay_hrs}h backlog`} />
                  )}
                  {result.levers_applied.route_capacity_pct < 0 && (
                    <BulletRec text="Diversify origin mix — increase Indonesia allocation by 30%" />
                  )}
                  {result.levers_applied.demand_spike_pct > 0 && (
                    <BulletRec text="Lock 6-month CoA at current rate before demand spike materialises" />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MetricBox({ label, value, sub, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function BulletRec({ text }) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-400">
      <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
      {text}
    </div>
  )
}
