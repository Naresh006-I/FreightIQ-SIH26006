const COMMODITY_LABELS = {
  thermal_coal: 'Thermal Coal', coking_coal: 'Coking Coal',
  iron_ore: 'Iron Ore', limestone: 'Limestone', bauxite: 'Bauxite',
}
const ORIGIN_LABELS = { AU:'Australia', ID:'Indonesia', US:'United States', MZ:'Mozambique', RU:'Russia' }
const PORT_LABELS   = { INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram', INGPL:'Gopalpur', INDMA:'Dhamra', INHAL:'Haldia' }

export default function SummaryBanner({ input, signal, seasonal }) {
  const signalColor = {
    'BUY NOW': 'border-emerald-500/40 bg-emerald-500/5',
    'WAIT':    'border-red-500/40 bg-red-500/5',
    'CAUTION': 'border-yellow-500/40 bg-yellow-500/5',
  }[signal.signal] || 'border-slate-700 bg-slate-900'

  return (
    <div className={`border rounded-2xl p-5 ${signalColor}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Analysis Summary</p>
          <h2 className="text-xl font-bold text-white">
            {(input.quantity_mt/1000).toFixed(0)}k MT {COMMODITY_LABELS[input.commodity] || input.commodity}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {ORIGIN_LABELS[input.origin_id]} → {PORT_LABELS[input.port_id]} · {input.period} ·{' '}
            {input.contract_months}mo contract · {input.route_distance_nm.toLocaleString()} NM
          </p>
          {seasonal.peak_demand && (
            <span className="inline-block mt-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              📈 Post-monsoon demand peak
            </span>
          )}
          {seasonal.monsoon && (
            <span className="inline-block mt-2 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
              🌧️ Monsoon season active
            </span>
          )}
        </div>
        <SignalBadge signal={signal} />
      </div>
    </div>
  )
}

function SignalBadge({ signal }) {
  const cfg = {
    'BUY NOW': { bg: 'bg-emerald-500', pulse: 'pulse-green', icon: '🟢' },
    'WAIT':    { bg: 'bg-red-500',     pulse: 'pulse-red',   icon: '🔴' },
    'CAUTION': { bg: 'bg-yellow-500',  pulse: '',            icon: '🟡' },
  }[signal.signal] || { bg: 'bg-slate-500', pulse: '', icon: '⚪' }

  return (
    <div className={`flex flex-col items-center gap-1 ${cfg.bg} ${cfg.pulse} rounded-2xl px-5 py-3 min-w-[110px]`}>
      <span className="text-2xl">{cfg.icon}</span>
      <span className="text-white font-black text-sm tracking-wide">{signal.signal}</span>
      <span className="text-white/70 text-xs">{signal.confidence}% confidence</span>
    </div>
  )
}
