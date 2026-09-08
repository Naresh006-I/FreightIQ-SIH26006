function Card({ title, icon, children, accent = 'border-slate-800' }) {
  return (
    <div className={`bg-slate-900 border ${accent} rounded-2xl p-5 h-full`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

const CII_COLOR = { A: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
                    B: 'text-green-400 bg-green-400/10 border-green-400/30',
                    C: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
                    D: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
                    E: 'text-red-400 bg-red-400/10 border-red-400/30' }

export default function VesselCard({ data }) {
  const { vessel_type, dwt, voyages_needed, sea_days, total_days,
          cost_per_tonne, total_voyage_cost_usd, cii_grade, reason } = data

  return (
    <Card title="Recommended Vessel" icon="🚢" accent="border-violet-900/50">
      {/* Vessel type hero */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-3xl font-black text-violet-300">{vessel_type}</p>
          <p className="text-sm text-slate-400">{(dwt/1000).toFixed(0)}k DWT</p>
        </div>
        <span className={`border rounded-xl px-3 py-1.5 font-bold text-sm ${CII_COLOR[cii_grade] || CII_COLOR.C}`}>
          CII {cii_grade}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label="Voyages" value={`${voyages_needed} voyage${voyages_needed > 1 ? 's' : ''}`} />
        <Stat label="Sea Days" value={`${sea_days} days`} />
        <Stat label="Cost / MT" value={`$${cost_per_tonne.toFixed(2)}`} highlight />
        <Stat label="Total Cost" value={`$${(total_voyage_cost_usd/1000).toFixed(0)}k`} />
      </div>

      {/* Reason */}
      <p className="text-xs text-slate-400 leading-relaxed">{reason}</p>
    </Card>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-violet-300' : 'text-slate-200'}`}>{value}</p>
    </div>
  )
}
