const TABS = [
  { id:'analyze',   label:'Freight Analysis', icon:'📊' },
  { id:'whatif',    label:'What-If Studio',    icon:'🔬' },
  { id:'portintel', label:'Port Intelligence', icon:'🛰️' },
]

/* ─────────────────────────────────────────────────────────────
   SAIL Logo — accurate recreation of the official mark:
   Blue rotated square (diamond) with white inner diamond
   and white upward-opening arch/chevron inside.
   "सेल SAIL" text below.
───────────────────────────────────────────────────────────── */
function SailLogoSVG({ size = 52 }) {
  return (
    <svg width={size} height={size + 14} viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer blue rotated square (diamond) */}
      <rect x="6" y="6" width="48" height="48" rx="2"
            fill="#003087"
            transform="rotate(45 30 30)" />
      {/* White inner diamond outline */}
      <rect x="13" y="13" width="34" height="34" rx="1"
            fill="none" stroke="white" strokeWidth="3"
            transform="rotate(45 30 30)" />
      {/* White arch / chevron — upward opening inverted V inside diamond */}
      <polyline points="18,34 30,20 42,34"
                fill="none" stroke="white" strokeWidth="5"
                strokeLinecap="round" strokeLinejoin="round" />
      {/* सेल SAIL text */}
      <text x="30" y="70" textAnchor="middle"
            fontSize="11" fontWeight="700"
            fill="#003087" fontFamily="Arial, sans-serif">
        सेल SAIL
      </text>
    </svg>
  )
}

export default function Header({ activeTab, onTabChange }) {
  return (
    <header style={{ position:'sticky', top:0, zIndex:100,
                     boxShadow:'0 2px 8px rgba(0,48,135,0.18)' }}>

      {/* ── Top white bar ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #dde3f4' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'8px 20px',
                      display:'flex', alignItems:'center', gap:16 }}>
          {/* SAIL Logo */}
          <SailLogoSVG size={48} />

          {/* Org text */}
          <div style={{ borderLeft:'2px solid #003087', paddingLeft:14 }}>
            <div style={{ fontWeight:800, fontSize:15, color:'#003087', lineHeight:1.2, letterSpacing:'0.01em' }}>
              Steel Authority of India Limited (SAIL)
            </div>
            <div style={{ fontSize:11, color:'#6b7a9e', marginTop:3, lineHeight:1.3 }}>
              Ministry of Steel &nbsp;·&nbsp; Government of India &nbsp;·&nbsp; Freight Intelligence Platform
            </div>
          </div>
        </div>
      </div>

      {/* ── Navy nav bar ── */}
      <div style={{ background:'#003087' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 20px',
                      display:'flex', alignItems:'stretch' }}>

          {/* Platform label */}
          <div style={{ padding:'11px 22px 11px 0',
                        borderRight:'1px solid rgba(255,255,255,0.18)',
                        display:'flex', flexDirection:'column', justifyContent:'center',
                        flexShrink:0 }}>
            <div style={{ color:'white', fontWeight:800, fontSize:14, letterSpacing:'0.06em' }}>
              FREIGHT INTELLIGENCE PLATFORM
            </div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10, marginTop:2, letterSpacing:'0.04em' }}>
              Bulk Cargo Procurement · East Coast India
            </div>
          </div>

          {/* Tabs */}
          <nav style={{ display:'flex', alignItems:'stretch', flex:1, paddingLeft:8 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => onTabChange(t.id)}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'0 22px', border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:600, background:'transparent',
                  color:       activeTab === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                  borderBottom:activeTab === t.id ? '3px solid #C8A84B' : '3px solid transparent',
                  transition:'color 0.15s',
                }}
                onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                <span style={{ fontSize:15 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Gold accent line */}
      <div style={{ height:3, background:'linear-gradient(90deg,#C8A84B,#e0c06a,#C8A84B)' }} />
    </header>
  )
}
