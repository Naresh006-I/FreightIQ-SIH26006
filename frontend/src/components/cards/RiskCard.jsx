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

const RISK_STYLE = {
  LOW:    { border: 'border-emerald-900/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  MEDIUM: { border: 'border-yellow-900/50',  bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  bar: 'bg-yellow-500' },
  HIGH:   { border: 'border-red-900/50',     bg: 'bg-red-500/10',     text: 'text-red-400',     bar: 'bg-red-500' },
}

const BREAKDOWN_LABELS = {
  market_risk: 'Market Risk', seasonal_risk: 'Seasonal Risk',
  congestion_risk: 'Congestion', geopolitical: 'Geopolitical', bunker_risk: 'Bunker Risk',
}

export default function RiskCard({ data }) {
  const { overall_score, level, factors, breakdown, var_95_usd, mitigation } = data
  const style = RISK_STYLE[level] || RISK_STYLE.MEDIUM

  return (
    <Card title="Risk Assessment" icon="⚠️" accent={style.border}>
      {/* Overall */}
      <div className={`${style.bg} rounded-xl p-3 mb-4 flex items-center justify-between`}>
        <div>
          <p className="text-xs text-slate-500">Overall Risk</p>
          <p className={`text-2xl font-black ${style.text}`}>{level}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Score</p>
          <p className={`text-2xl font-black ${style.text}`}>{overall_score}</p>
        </div>
      </div>

      {/* Risk breakdown bars */}
      <div className="space-y-2 mb-4">
        {Object.entries(breakdown).map(([key, val]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-500">{BREAKDOWN_LABELS[key] || key}</span>
              <span className="text-slate-400">{val}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${val > 60 ? 'bg-red-500' : val > 35 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* VaR */}
      <div className="bg-slate-800/50 rounded-xl p-3 mb-3">
        <p className="text-xs text-slate-500">Value at Risk (95%)</p>
        <p className="text-base font-bold text-slate-200">${var_95_usd.toLocaleString()}</p>
      </div>

      {/* Factors */}
      <div className="space-y-1.5 mb-3">
        {factors.map((f, i) => (
          <p key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
            <span className={`mt-0.5 flex-shrink-0 ${style.text}`}>•</span>
            {f}
          </p>
        ))}
      </div>

      {/* Mitigation */}
      <div className="bg-slate-800/50 rounded-lg p-2.5">
        <p className="text-xs text-sky-400">💡 {mitigation}</p>
      </div>
    </Card>
  )
}
