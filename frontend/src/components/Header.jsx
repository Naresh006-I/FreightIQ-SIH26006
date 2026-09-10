/**
 * Header — Professional Government of India style
 * Left  : SAIL logo + Steel Authority of India Limited title
 * Right : Ashoka Emblem (India national emblem) + ministry badge + date
 * Nav   : Navy bar with tab navigation
 */

const TABS = [
  { id:'analyze',   label:'Freight Analysis'  },
  { id:'whatif',    label:'What-If'            },
  { id:'portintel', label:'Port Intelligence'  },
]

// ── SAIL Diamond Logo SVG (original structure) ────────────────────────────────
function SailLogo({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer blue diamond */}
      <rect x="12" y="12" width="56" height="56" rx="2"
            fill="#003087" transform="rotate(45 40 40)" />
      {/* White inner diamond border */}
      <rect x="20" y="20" width="40" height="40" rx="1.5"
            fill="none" stroke="white" strokeWidth="3.5"
            transform="rotate(45 40 40)" />
      {/* White upward arch / chevron */}
      <polyline points="24,50 40,28 56,50"
                fill="none" stroke="white" strokeWidth="5.5"
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Ashoka Emblem SVG (simplified national emblem — no Unicode, pure SVG) ────
function AashokaEmblem({ size = 44 }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circular base — Ashoka Chakra (wheel) representation */}
      <circle cx="40" cy="32" r="28" fill="none" stroke="#003087" strokeWidth="2.5" />
      <circle cx="40" cy="32" r="20" fill="none" stroke="#003087" strokeWidth="1.5" />
      <circle cx="40" cy="32" r="5"  fill="#003087" />
      {/* 24 spokes of Ashoka Chakra */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 360) / 24
        const rad   = (angle * Math.PI) / 180
        const x1    = 40 + 6  * Math.sin(rad)
        const y1    = 32 - 6  * Math.cos(rad)
        const x2    = 40 + 19 * Math.sin(rad)
        const y2    = 32 - 19 * Math.cos(rad)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                     stroke="#003087" strokeWidth="1.2" />
      })}
      {/* Four lions silhouette (simplified as layered rectangles) */}
      <rect x="28" y="58" width="24" height="10" rx="1" fill="#003087" />
      <rect x="30" y="54" width="8"  height="6"  rx="1" fill="#003087" />
      <rect x="42" y="54" width="8"  height="6"  rx="1" fill="#003087" />
      <rect x="36" y="52" width="8"  height="4"  rx="1" fill="#003087" />
      {/* Satyameva Jayate text */}
      <text x="40" y="80" textAnchor="middle" fontSize="7.5" fontWeight="700"
            fill="#003087" fontFamily="Arial, sans-serif" letterSpacing="0.5">
        SATYAMEVA JAYATE
      </text>
      {/* Devanagari */}
      <text x="40" y="90" textAnchor="middle" fontSize="6.5" fontWeight="600"
            fill="#6b7a9e" fontFamily="Arial, sans-serif">
        सत्यमेव जयते
      </text>
    </svg>
  )
}

// ── Government of India star separator ───────────────────────────────────────
function StarSep() {
  return <span style={{ color:'#C8A84B', fontSize:10, margin:'0 6px' }}>&#9830;</span>
}

export default function Header({ activeTab, onTabChange }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday:'short', year:'numeric', month:'short', day:'numeric',
  })

  return (
    <header style={{ position:'sticky', top:0, zIndex:100,
                     boxShadow:'0 2px 10px rgba(0,48,135,0.18)' }}>

      {/* ── TOP WHITE INFO BAR ─────────────────────────────────────────────── */}
      <div style={{ background:'#ffffff', borderBottom:'1px solid #dde3f4' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'10px 24px',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>

          {/* LEFT — SAIL branding */}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <SailLogo size={52} />
            <div style={{ borderLeft:'3px solid #003087', paddingLeft:14 }}>
              <div style={{ fontWeight:900, fontSize:16, color:'#003087',
                            lineHeight:1.2, letterSpacing:'0.01em' }}>
                Steel Authority of India Limited (SAIL)
              </div>
              <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4,
                            display:'flex', alignItems:'center', flexWrap:'wrap', gap:0 }}>
                <span>Ministry of Steel</span>
                <StarSep />
                <span>Government of India</span>
                <StarSep />
                <span>Freight Intelligence Platform</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Ashoka Emblem + India info */}
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            {/* Date + system info */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#003087' }}>
                Intelligent Freight Forecasting System
              </div>
              <div style={{ fontSize:10, color:'#6b7a9e', marginTop:3 }}>
                {dateStr}
                <StarSep />
                <span style={{ color:'#1b5e20', fontWeight:600 }}>System Active</span>
              </div>
              <div style={{ fontSize:10, color:'#6b7a9e', marginTop:2 }}>
                East Coast India &middot; Bulk Cargo Procurement
              </div>
            </div>

            {/* Vertical divider */}
            <div style={{ width:1, height:52, background:'#dde3f4' }} />

            {/* Ashoka Emblem */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <AashokaEmblem size={44} />
            </div>

            {/* Vertical divider */}
            <div style={{ width:1, height:52, background:'#dde3f4' }} />

            {/* Ministry badge */}
            <div style={{ textAlign:'center' }}>
              <div style={{ background:'#003087', color:'white', fontSize:9,
                            fontWeight:700, padding:'3px 10px', borderRadius:3,
                            letterSpacing:'0.06em', textTransform:'uppercase' }}>
                Ministry of Steel
              </div>
              <div style={{ fontSize:9, color:'#6b7a9e', marginTop:4,
                            textAlign:'center', letterSpacing:'0.04em' }}>
                Government of India
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVY NAVIGATION BAR ───────────────────────────────────────────── */}
      <div style={{ background:'#003087' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px',
                      display:'flex', alignItems:'stretch' }}>

          {/* Platform title */}
          <div style={{ padding:'11px 24px 11px 0',
                        borderRight:'1px solid rgba(255,255,255,0.18)',
                        display:'flex', flexDirection:'column',
                        justifyContent:'center', flexShrink:0 }}>
            <div style={{ color:'white', fontWeight:800, fontSize:13,
                          letterSpacing:'0.08em', textTransform:'uppercase' }}>
              Freight Intelligence Platform
            </div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10,
                          marginTop:3, letterSpacing:'0.04em' }}>
              Bulk Cargo Procurement &middot; East Coast India
            </div>
          </div>

          {/* Tab navigation */}
          <nav style={{ display:'flex', alignItems:'stretch', flex:1, paddingLeft:8 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => onTabChange(t.id)}
                style={{
                  display:'flex', alignItems:'center',
                  padding:'0 22px', border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:600, background:'transparent',
                  color:        activeTab === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                  borderBottom: activeTab === t.id ? '3px solid #C8A84B' : '3px solid transparent',
                  transition:  'color 0.15s',
                  letterSpacing:'0.02em',
                }}
                onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Right side — helpline text */}
          <div style={{ display:'flex', alignItems:'center', paddingLeft:24,
                        borderLeft:'1px solid rgba(255,255,255,0.18)' }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:9,
                            textTransform:'uppercase', letterSpacing:'0.06em' }}>
                SAIL Helpline
              </div>
              <div style={{ color:'rgba(255,255,255,0.85)', fontSize:11,
                            fontWeight:700, marginTop:1 }}>
                

1800-345-7695
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gold accent line */}
      <div style={{ height:3,
                    background:'linear-gradient(90deg, #C8A84B 0%, #e0c06a 50%, #C8A84B 100%)' }} />
    </header>
  )
}
