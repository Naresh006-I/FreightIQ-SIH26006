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

const CONGESTION_COLOR = { LOW: 'text-emerald-400', MEDIUM: 'text-yellow-400', HIGH: 'text-red-400' }

export default function PortCard({ data }) {
  const {
    port_name, compatible, status, status_color,
    draft_ok, loa_ok, commodity_handled, lightering_needed,
    max_draft_m, vessel_draft_m, berths_available, congestion, issues,
  } = data

  const accentMap = { green: 'border-emerald-900/50', yellow: 'border-yellow-900/50', red: 'border-red-900/50' }
  const badgeBg   = { green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                      yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                      red:   'bg-red-500/10 text-red-400 border-red-500/30' }

  return (
    <Card title="Port Compatibility" icon="⚓" accent={accentMap[status_color]}>
      {/* Port + status */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xl font-bold text-white">{port_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">East Coast India</p>
        </div>
        <span className={`border rounded-xl px-3 py-1.5 text-xs font-bold ${badgeBg[status_color]}`}>
          {status_color === 'green' ? '✓' : status_color === 'yellow' ? '⚠' : '✗'} {status.split(' ')[0]}
        </span>
      </div>

      {/* Check list */}
      <div className="space-y-2 mb-4">
        <CheckRow ok={draft_ok} label={`Draft: ${vessel_draft_m}m vessel / ${max_draft_m}m port limit`} />
        <CheckRow ok={loa_ok}   label="LOA within port limit" />
        <CheckRow ok={commodity_handled} label="Commodity handled at this port" />
        <CheckRow ok={!lightering_needed} label="No lightering required" warn={lightering_needed} />
      </div>

      {/* Congestion */}
      <div className="bg-slate-800/50 rounded-xl p-3">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-500">Port Congestion</p>
          <span className={`text-xs font-bold ${CONGESTION_COLOR[congestion.congestion_level]}`}>
            {congestion.congestion_level}
          </span>
        </div>
        <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${congestion.utilisation_pct > 65 ? 'bg-red-500' : congestion.utilisation_pct > 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
            style={{ width: `${congestion.utilisation_pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-slate-500">
          <span>{congestion.utilisation_pct}% utilised</span>
          <span>Wait: ~{congestion.avg_wait_days}d</span>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-3 space-y-1">
          {issues.map((iss, i) => (
            <p key={i} className="text-xs text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-2 py-1">
              ⚠ {iss}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

function CheckRow({ ok, label, warn }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
        ok ? 'bg-emerald-500/20 text-emerald-400' : warn ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
      }`}>
        {ok ? '✓' : warn ? '!' : '✗'}
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}
