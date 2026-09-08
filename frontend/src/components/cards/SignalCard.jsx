function CardHeader({ icon, title }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-sail-navy">
      <span className="text-base">{icon}</span>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
    </div>
  )
}

const SIGNAL_STYLE = {
  green:  { bar:'bg-green-500',  bg:'bg-green-50',  text:'text-green-700',  border:'border-green-300',  badge:'bg-green-600'  },
  red:    { bar:'bg-red-500',    bg:'bg-red-50',    text:'text-red-700',    border:'border-red-300',    badge:'bg-red-600'    },
  yellow: { bar:'bg-yellow-500', bg:'bg-yellow-50', text:'text-yellow-700', border:'border-yellow-300', badge:'bg-yellow-500' },
}

export default function SignalCard({ data }) {
  const { signal, color, confidence, action, trend_pct, vol_pct } = data
  const s = SIGNAL_STYLE[color] || SIGNAL_STYLE.yellow

  return (
    <div className="sail-card overflow-hidden">
      <CardHeader icon="🎯" title="Market Entry Signal" />
      <div className="p-4">
        {/* Big signal */}
        <div className={`${s.bg} border ${s.border} rounded p-4 mb-3 text-center`}>
          <p className={`text-3xl font-black ${s.text} tracking-wide`}>{signal}</p>
          {/* Confidence bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div className={`${s.bar} h-1.5 rounded-full`} style={{width:`${confidence}%`}} />
          </div>
          <p className="text-[11px] text-sail-muted mt-1">{confidence}% Model Confidence</p>
        </div>

        <p className="text-[13px] text-sail-text leading-relaxed mb-3">{action}</p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-sail-offwhite rounded p-2.5 text-center">
            <p className="text-[10px] text-sail-muted uppercase tracking-wide">Rate Trend</p>
            <p className={`text-base font-bold ${trend_pct < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend_pct > 0 ? '+' : ''}{trend_pct}%
            </p>
          </div>
          <div className="bg-sail-offwhite rounded p-2.5 text-center">
            <p className="text-[10px] text-sail-muted uppercase tracking-wide">Volatility</p>
            <p className={`text-base font-bold ${vol_pct < 5 ? 'text-green-600' : vol_pct < 10 ? 'text-yellow-600' : 'text-red-600'}`}>
              {vol_pct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
