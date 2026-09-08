function CardHeader({ icon, title }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-sail-navy">
      <span>{icon}</span>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
    </div>
  )
}

const CONG_COLOR = { LOW:'text-green-600', MEDIUM:'text-yellow-600', HIGH:'text-red-600' }
const CONG_BAR   = { LOW:'bg-green-500',   MEDIUM:'bg-yellow-500',   HIGH:'bg-red-500'   }

export default function PortCard({ data }) {
  const {
    port_name, compatible, status, status_color,
    draft_ok, loa_ok, commodity_handled, lightering_needed,
    max_draft_m, vessel_draft_m, berths_available, congestion, issues,
  } = data

  const badgeCls = {
    green:  'bg-green-100 text-green-800 border border-green-400',
    yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-400',
    red:    'bg-red-100 text-red-800 border border-red-400',
  }[status_color] || ''

  return (
    <div className="sail-card overflow-hidden">
      <CardHeader icon="⚓" title="Port Compatibility" />
      <div className="p-4">
        {/* Port name + badge */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xl font-bold text-sail-navy">{port_name}</p>
            <p className="text-[11px] text-sail-muted">East Coast India · SAIL Procurement Port</p>
          </div>
          <span className={`rounded px-2.5 py-1 text-[11px] font-bold ${badgeCls}`}>
            {status_color === 'green' ? '✓' : status_color === 'yellow' ? '⚠' : '✗'}&nbsp;
            {status.split(' ')[0]}
          </span>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5 mb-3">
          {[
            { ok: draft_ok,            warn: false,            label: `Draft: ${vessel_draft_m}m vessel / ${max_draft_m}m port limit` },
            { ok: loa_ok,              warn: false,            label: 'Vessel LOA within port limit' },
            { ok: commodity_handled,   warn: false,            label: 'Commodity handled at this port' },
            { ok: !lightering_needed,  warn: lightering_needed,label: 'No lightering required' },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                r.ok ? 'bg-green-100 text-green-700' : r.warn ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {r.ok ? '✓' : r.warn ? '!' : '✗'}
              </span>
              <span className="text-[12px] text-sail-text">{r.label}</span>
            </div>
          ))}
        </div>

        {/* Congestion bar */}
        <div className="bg-sail-offwhite rounded p-3 mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[11px] text-sail-muted font-semibold uppercase tracking-wide">Port Congestion</p>
            <span className={`text-[11px] font-bold ${CONG_COLOR[congestion.congestion_level]}`}>
              {congestion.congestion_level}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full ${CONG_BAR[congestion.congestion_level]}`}
              style={{width:`${congestion.utilisation_pct}%`}} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-sail-muted">
            <span>{congestion.utilisation_pct}% utilised · {berths_available} berths</span>
            <span>Avg wait: {congestion.avg_wait_days}d</span>
          </div>
        </div>

        {issues.length > 0 && issues.map((iss, i) => (
          <p key={i} className="text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mt-1">
            ⚠ {iss}
          </p>
        ))}
      </div>
    </div>
  )
}
