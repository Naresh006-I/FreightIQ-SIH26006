const CON_COLOR = { LOW:'#1b5e20', MEDIUM:'#e65100', HIGH:'#b71c1c' }
const CON_BAR   = { LOW:'#43a047', MEDIUM:'#ffa726', HIGH:'#e53935' }

export default function PortCard({ data }) {
  const {
    port_name, status, status_color,
    draft_ok, loa_ok, commodity_handled, lightering_needed,
    max_draft_m, vessel_draft_m, berths_available, congestion, issues,
  } = data

  const badgeStyle = {
    green:  { background:'#e8f5e9', color:'#1b5e20', border:'1px solid #a5d6a7' },
    yellow: { background:'#fff8e1', color:'#e65100', border:'1px solid #ffe082' },
    red:    { background:'#ffebee', color:'#b71c1c', border:'1px solid #ef9a9a' },
  }[status_color] || {}

  const checks = [
    { ok: draft_ok,            warn: false,             label:`Draft: vessel ${vessel_draft_m}m / port limit ${max_draft_m}m` },
    { ok: loa_ok,              warn: false,             label:'Vessel LOA within port limit' },
    { ok: commodity_handled,   warn: false,             label:'Commodity handled at this port' },
    { ok: !lightering_needed,  warn: lightering_needed, label:'No lightering required' },
  ]

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span>⚓</span>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Port Compatibility</span>
      </div>
      <div style={{ padding:16 }}>
        {/* Port + status */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:'#003087' }}>{port_name}</div>
            <div style={{ fontSize:11, color:'#6b7a9e', marginTop:2 }}>{berths_available} Berths · East Coast India</div>
          </div>
          <div style={{ ...badgeStyle, padding:'5px 12px', borderRadius:5, fontSize:12, fontWeight:700 }}>
            {status_color === 'green' ? '✓' : status_color === 'yellow' ? '⚠' : '✗'}&nbsp;
            {status.split(' ')[0]}
          </div>
        </div>

        {/* Checks */}
        <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
          {checks.map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:20, height:20, borderRadius:'50%', flexShrink:0, display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
                background: c.ok ? '#e8f5e9' : c.warn ? '#fff8e1' : '#ffebee',
                color:       c.ok ? '#1b5e20' : c.warn ? '#e65100' : '#b71c1c',
              }}>
                {c.ok ? '✓' : c.warn ? '!' : '✗'}
              </div>
              <span style={{ fontSize:12, color:'#1a2340' }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Congestion */}
        <div style={{ background:'#f5f7fc', border:'1px solid #dde3f4', borderRadius:6, padding:'10px 12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:11, color:'#6b7a9e', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Port Congestion
            </span>
            <span style={{ fontSize:11, fontWeight:700, color: CON_COLOR[congestion.congestion_level] }}>
              {congestion.congestion_level}
            </span>
          </div>
          <div style={{ background:'#e8ecf4', borderRadius:4, height:6, overflow:'hidden' }}>
            <div style={{ height:6, borderRadius:4, background: CON_BAR[congestion.congestion_level],
                          width:`${congestion.utilisation_pct}%`, transition:'width 0.4s' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7a9e', marginTop:5 }}>
            <span>{congestion.utilisation_pct}% berth utilisation</span>
            <span>Avg wait: {congestion.avg_wait_days}d</span>
          </div>
        </div>

        {issues.length > 0 && issues.map((iss, i) => (
          <div key={i} style={{ fontSize:11, color:'#e65100', background:'#fff8e1',
                                  border:'1px solid #ffe082', borderRadius:5, padding:'6px 10px', marginTop:8 }}>
            ⚠ {iss}
          </div>
        ))}
      </div>
    </div>
  )
}
