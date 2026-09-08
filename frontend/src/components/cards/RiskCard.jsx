function CardHeader({ icon, title }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-sail-navy">
      <span>{icon}</span>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
    </div>
  )
}

const RISK_STYLE = {
  LOW:    { bg:'bg-green-50  border-green-300',  text:'text-green-700',  bar:'bg-green-500'  },
  MEDIUM: { bg:'bg-yellow-50 border-yellow-300', text:'text-yellow-700', bar:'bg-yellow-500' },
  HIGH:   { bg:'bg-red-50    border-red-300',    text:'text-red-700',    bar:'bg-red-500'    },
}

const BD_LABELS = {
  market_risk:'Market Risk', seasonal_risk:'Seasonal Risk',
  congestion_risk:'Congestion', geopolitical:'Geopolitical', bunker_risk:'Bunker Risk',
}

export default function RiskCard({ data }) {
  const { overall_score, level, factors, breakdown, var_95_usd, mitigation } = data
  const s = RISK_STYLE[level] || RISK_STYLE.MEDIUM

  return (
    <div className="sail-card overflow-hidden">
      <CardHeader icon="⚠️" title="Risk Assessment" />
      <div className="p-4">
        {/* Overall */}
        <div className={`border rounded p-3 mb-3 flex items-center justify-between ${s.bg}`}>
          <div>
            <p className="text-[10px] text-sail-muted uppercase tracking-wide">Overall Risk Level</p>
            <p className={`text-2xl font-black ${s.text}`}>{level}</p>
          </div>
          <div className={`text-3xl font-black ${s.text}`}>{overall_score}<span className="text-sm font-normal">/100</span></div>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-2 mb-3">
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="text-sail-muted">{BD_LABELS[k] || k}</span>
                <span className="text-sail-text font-medium">{v}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${v>60?'bg-red-500':v>35?'bg-yellow-500':'bg-green-500'}`}
                  style={{width:`${v}%`}} />
              </div>
            </div>
          ))}
        </div>

        {/* VaR */}
        <div className="bg-sail-offwhite rounded p-2.5 mb-3 flex justify-between items-center">
          <p className="text-[11px] text-sail-muted font-semibold">Value at Risk (95% Confidence)</p>
          <p className="text-[13px] font-bold text-sail-navy">${var_95_usd.toLocaleString()}</p>
        </div>

        {/* Factors */}
        <div className="space-y-1 mb-2">
          {factors.map((f, i) => (
            <p key={i} className={`text-[11px] flex items-start gap-1.5 ${s.text}`}>
              <span className="mt-0.5 flex-shrink-0">•</span>{f}
            </p>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-[11px] text-sail-navy">💡 {mitigation}</p>
        </div>
      </div>
    </div>
  )
}
