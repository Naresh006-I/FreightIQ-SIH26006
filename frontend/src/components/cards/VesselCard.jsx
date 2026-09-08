function CardHeader({ icon, title }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-sail-navy">
      <span>{icon}</span>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
    </div>
  )
}

const CII_STYLE = {
  A: 'bg-green-100 text-green-800 border-green-400',
  B: 'bg-green-50  text-green-700 border-green-300',
  C: 'bg-yellow-50 text-yellow-800 border-yellow-400',
  D: 'bg-orange-50 text-orange-700 border-orange-400',
  E: 'bg-red-50    text-red-700   border-red-400',
}

export default function VesselCard({ data }) {
  const { vessel_type, dwt, voyages_needed, sea_days, cost_per_tonne, total_voyage_cost_usd, cii_grade, reason } = data
  return (
    <div className="sail-card overflow-hidden">
      <CardHeader icon="🚢" title="Recommended Vessel" />
      <div className="p-4">
        {/* Hero */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-black text-sail-navy">{vessel_type}</p>
            <p className="text-[12px] text-sail-muted">{(dwt/1000).toFixed(0),000} DWT &nbsp;·&nbsp; {voyages_needed} Voyage{voyages_needed>1?'s':''}</p>
          </div>
          <span className={`border rounded px-3 py-1.5 text-sm font-bold ${CII_STYLE[cii_grade] || CII_STYLE.C}`}>
            IMO CII: {cii_grade}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'DWT',         value: `${(dwt/1000).toFixed(0)}k MT` },
            { label: 'Sea Days',    value: `${sea_days} days` },
            { label: 'Cost / MT',   value: `$${cost_per_tonne.toFixed(2)}`, bold: true },
            { label: 'Total Cost',  value: `$${(total_voyage_cost_usd/1000).toFixed(0)}k` },
          ].map(s => (
            <div key={s.label} className="bg-sail-offwhite rounded p-2.5">
              <p className="text-[10px] text-sail-muted uppercase tracking-wide">{s.label}</p>
              <p className={`text-[13px] font-bold ${s.bold ? 'text-sail-navy' : 'text-sail-text'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-sail-muted leading-relaxed border-t border-sail-gray pt-2">{reason}</p>
      </div>
    </div>
  )
}
