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

export default function SignalCard({ data }) {
  const { signal, color, confidence, action, trend_pct, vol_pct } = data

  const styles = {
    green:  { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500' },
    red:    { border: 'border-red-500/40',     bg: 'bg-red-500/10',     text: 'text-red-400',     badge: 'bg-red-500' },
    yellow: { border: 'border-yellow-500/40',  bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  badge: 'bg-yellow-500' },
  }[color] || styles.green

  return (
    <Card title="Market Signal" icon="🎯" accent={styles.border}>
      {/* Big signal */}
      <div className={`${styles.bg} rounded-xl p-4 mb-4 text-center`}>
        <span className={`text-3xl font-black ${styles.text} tracking-wide`}>{signal}</span>
        <div className="mt-1">
          <ConfidenceBar value={confidence} color={color} />
          <p className="text-xs text-slate-400 mt-1">{confidence}% model confidence</p>
        </div>
      </div>

      {/* Action */}
      <p className="text-sm text-slate-300 leading-relaxed mb-4">{action}</p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Rate Trend" value={`${trend_pct > 0 ? '+' : ''}${trend_pct}%`}
          color={trend_pct < 0 ? 'text-emerald-400' : 'text-red-400'} />
        <Metric label="Volatility" value={`${vol_pct.toFixed(1)}%`}
          color={vol_pct < 5 ? 'text-emerald-400' : vol_pct < 10 ? 'text-yellow-400' : 'text-red-400'} />
      </div>
    </Card>
  )
}

function ConfidenceBar({ value, color }) {
  const barColor = { green: 'bg-emerald-500', red: 'bg-red-500', yellow: 'bg-yellow-500' }[color] || 'bg-sky-500'
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
      <div className={`${barColor} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  )
}
