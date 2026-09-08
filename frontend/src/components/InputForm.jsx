const COMMODITIES = [
  { id: 'thermal_coal', label: 'Thermal Coal'  },
  { id: 'coking_coal',  label: 'Coking Coal'   },
  { id: 'iron_ore',     label: 'Iron Ore'       },
  { id: 'limestone',    label: 'Limestone'      },
  { id: 'bauxite',      label: 'Bauxite'        },
]
const ORIGINS = [
  { id: 'AU', label: 'Australia',    sub: 'Newcastle · Hay Point' },
  { id: 'ID', label: 'Indonesia',    sub: 'Samarinda · Taboneo'   },
  { id: 'US', label: 'United States',sub: 'Norfolk'               },
  { id: 'MZ', label: 'Mozambique',   sub: 'Maputo · Nacala'       },
  { id: 'RU', label: 'Russia',       sub: 'Taman · Ust-Luga'      },
]
const PORTS = [
  { id: 'INPRD', label: 'Paradip',        state: 'Odisha',         draft: 17.0 },
  { id: 'INVTZ', label: 'Visakhapatnam',  state: 'Andhra Pradesh', draft: 14.5 },
  { id: 'INGVP', label: 'Gangavaram',     state: 'Andhra Pradesh', draft: 18.0 },
  { id: 'INGPL', label: 'Gopalpur',       state: 'Odisha',         draft: 12.5 },
  { id: 'INDMA', label: 'Dhamra',         state: 'Odisha',         draft: 16.5 },
  { id: 'INHAL', label: 'Haldia',         state: 'West Bengal',    draft: 8.5  },
]
const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]

function FieldLabel({ children }) {
  return (
    <label className="block text-[11px] font-bold text-sail-navy uppercase tracking-wider mb-1">
      {children}
    </label>
  )
}

function SailSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="sail-input bg-white appearance-none cursor-pointer"
    >
      {children}
    </select>
  )
}

export default function InputForm({ form, onChange, onSubmit, loading }) {
  function set(key, val) { onChange(prev => ({ ...prev, [key]: val })) }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}
      className="sail-card overflow-hidden">

      {/* Form header — navy band */}
      <div className="bg-sail-navy px-5 py-4">
        <h2 className="font-heading font-bold text-white text-[16px] tracking-wide">
          SHIPMENT ANALYSIS REQUEST
        </h2>
        <p className="text-blue-300 text-[11px] mt-0.5">
          Enter cargo details to receive AI-powered freight intelligence
        </p>
      </div>

      {/* Gold accent line */}
      <div className="h-[3px] bg-sail-gold" />

      <div className="p-5 space-y-4 bg-sail-offwhite">

        {/* Commodity */}
        <div>
          <FieldLabel>Commodity Type</FieldLabel>
          <SailSelect value={form.commodity} onChange={v => set('commodity', v)}>
            {COMMODITIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </SailSelect>
        </div>

        {/* Quantity */}
        <div>
          <FieldLabel>Quantity (Metric Tonnes)</FieldLabel>
          <input
            type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
            onChange={e => set('quantity_mt', Number(e.target.value))}
            className="sail-input"
          />
          <p className="text-[11px] text-sail-muted mt-1">
            {form.quantity_mt.toLocaleString()} MT · {(form.quantity_mt / 1000).toFixed(0)}k Metric Tonnes
          </p>
        </div>

        {/* Origin */}
        <div>
          <FieldLabel>Origin Country / Port</FieldLabel>
          <SailSelect value={form.origin_id} onChange={v => set('origin_id', v)}>
            {ORIGINS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </SailSelect>
          <p className="text-[11px] text-sail-muted mt-1">
            {ORIGINS.find(o => o.id === form.origin_id)?.sub}
          </p>
        </div>

        {/* Destination */}
        <div>
          <FieldLabel>Destination Port (East Coast India)</FieldLabel>
          <SailSelect value={form.port_id} onChange={v => set('port_id', v)}>
            {PORTS.map(p => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.state} (Max Draft {p.draft}m)
              </option>
            ))}
          </SailSelect>
        </div>

        {/* Delivery Period */}
        <div>
          <FieldLabel>Required Delivery Period</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <SailSelect value={form.target_month} onChange={v => set('target_month', Number(v))}>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </SailSelect>
            <SailSelect value={form.target_year} onChange={v => set('target_year', Number(v))}>
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </SailSelect>
          </div>
        </div>

        {/* Contract Duration */}
        <div>
          <FieldLabel>Contract Duration</FieldLabel>
          <SailSelect value={form.contract_months} onChange={v => set('contract_months', Number(v))}>
            {[1, 3, 6, 9, 12, 18, 24].map(m => (
              <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
            ))}
          </SailSelect>
        </div>

        {/* Divider */}
        <div className="border-t border-sail-gray" />

        {/* Submit */}
        <button
          type="submit" disabled={loading}
          className="w-full sail-btn-primary py-3 flex items-center justify-center gap-2 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analysing…
            </>
          ) : (
            <>
              <span className="text-sail-gold">▶</span>
              Run Freight Analysis
            </>
          )}
        </button>

        <p className="text-[10px] text-sail-muted text-center">
          AI-powered · SAIL Internal Use · SIH26006 Decision Support System
        </p>
      </div>
    </form>
  )
}
