const COMMODITIES = [
  { id: 'thermal_coal', label: '🪨 Thermal Coal' },
  { id: 'coking_coal',  label: '⚫ Coking Coal' },
  { id: 'iron_ore',     label: '🔩 Iron Ore' },
  { id: 'limestone',    label: '🪨 Limestone' },
  { id: 'bauxite',      label: '🟤 Bauxite' },
]

const ORIGINS = [
  { id: 'AU', label: '🇦🇺 Australia',      sub: 'Newcastle · Hay Point' },
  { id: 'ID', label: '🇮🇩 Indonesia',      sub: 'Samarinda · Taboneo' },
  { id: 'US', label: '🇺🇸 United States',  sub: 'Norfolk' },
  { id: 'MZ', label: '🇲🇿 Mozambique',     sub: 'Maputo · Nacala' },
  { id: 'RU', label: '🇷🇺 Russia',         sub: 'Taman · Ust-Luga' },
]

const PORTS = [
  { id: 'INPRD', label: 'Paradip',        state: 'Odisha',        draft: 17.0 },
  { id: 'INVTZ', label: 'Visakhapatnam',  state: 'Andhra Pradesh',draft: 14.5 },
  { id: 'INGVP', label: 'Gangavaram',     state: 'Andhra Pradesh',draft: 18.0 },
  { id: 'INGPL', label: 'Gopalpur',       state: 'Odisha',        draft: 12.5 },
  { id: 'INDMA', label: 'Dhamra',         state: 'Odisha',        draft: 16.5 },
  { id: 'INHAL', label: 'Haldia',         state: 'West Bengal',   draft: 8.5  },
]

const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]

function Label({ children }) {
  return <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{children}</label>
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
    >
      {children}
    </select>
  )
}

function Input({ type = 'number', value, onChange, min, max, step }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min} max={max} step={step}
      className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-sky-500 transition-colors"
    />
  )
}

export default function InputForm({ form, onChange, onSubmit, loading }) {
  function set(key, value) {
    onChange(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      {/* Title */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-base font-bold text-white">Shipment Analysis</h2>
        <p className="text-xs text-slate-500 mt-0.5">Enter cargo details to get AI-powered chartering insights</p>
      </div>

      {/* Commodity */}
      <div>
        <Label>Commodity</Label>
        <Select value={form.commodity} onChange={v => set('commodity', v)}>
          {COMMODITIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
      </div>

      {/* Quantity */}
      <div>
        <Label>Quantity (Metric Tonnes)</Label>
        <Input
          value={form.quantity_mt}
          onChange={v => set('quantity_mt', v)}
          min={10000} max={500000} step={5000}
        />
        <p className="text-xs text-slate-500 mt-1">{(form.quantity_mt/1000).toFixed(0)}k MT</p>
      </div>

      {/* Origin */}
      <div>
        <Label>Origin Country</Label>
        <Select value={form.origin_id} onChange={v => set('origin_id', v)}>
          {ORIGINS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
        <p className="text-xs text-slate-500 mt-1">
          {ORIGINS.find(o => o.id === form.origin_id)?.sub}
        </p>
      </div>

      {/* Destination Port */}
      <div>
        <Label>Destination Port</Label>
        <Select value={form.port_id} onChange={v => set('port_id', v)}>
          {PORTS.map(p => (
            <option key={p.id} value={p.id}>{p.label} — {p.state} (draft {p.draft}m)</option>
          ))}
        </Select>
      </div>

      {/* Delivery Period */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Month</Label>
          <Select value={form.target_month} onChange={v => set('target_month', Number(v))}>
            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </Select>
        </div>
        <div>
          <Label>Year</Label>
          <Select value={form.target_year} onChange={v => set('target_year', Number(v))}>
            {[2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
      </div>

      {/* Contract Duration */}
      <div>
        <Label>Contract Duration (Months)</Label>
        <Select value={form.contract_months} onChange={v => set('contract_months', Number(v))}>
          {[1,3,6,9,12,18,24].map(m => (
            <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
          ))}
        </Select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl py-3 transition-all duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <span>⚡</span> Run Analysis
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-xs text-slate-600 text-center">
        AI-powered · Synthetic training data · For decision support only
      </p>
    </form>
  )
}
