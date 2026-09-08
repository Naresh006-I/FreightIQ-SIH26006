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

export default function ContractCard({ data }) {
  const { recommended_type, recommended_rate, recommended_cost_usd,
          saving_vs_spot_usd, rationale, options } = data

  return (
    <Card title="Contract Recommendation" icon="📄" accent="border-amber-900/50">
      {/* Recommended */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
        <p className="text-xs text-amber-400/70 font-semibold uppercase tracking-wider">Recommended</p>
        <p className="text-lg font-black text-amber-300 mt-0.5">{recommended_type}</p>
        <p className="text-sm text-slate-300 mt-1">${recommended_rate}/MT · Total ${(recommended_cost_usd/1_000_000).toFixed(2)}M</p>
      </div>

      {/* Options comparison */}
      <div className="space-y-2 mb-4">
        {options.map((opt, i) => {
          const isRec = opt.type === recommended_type
          return (
            <div key={i} className={`flex justify-between items-center px-3 py-2 rounded-lg text-xs ${
              isRec ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/50'
            }`}>
              <div>
                <span className={`font-medium ${isRec ? 'text-amber-300' : 'text-slate-300'}`}>{opt.type}</span>
                {opt.discount_pct > 0 && (
                  <span className="ml-2 text-emerald-400 text-xs">-{opt.discount_pct}%</span>
                )}
              </div>
              <div className="text-right">
                <span className={isRec ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                  ${opt.rate}/MT
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Saving */}
      {saving_vs_spot_usd > 0 && (
        <div className="bg-emerald-500/10 rounded-xl p-3 mb-3">
          <p className="text-xs text-emerald-400">Saving vs Spot</p>
          <p className="text-lg font-bold text-emerald-300">${saving_vs_spot_usd.toLocaleString()}</p>
        </div>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">{rationale}</p>
    </Card>
  )
}
