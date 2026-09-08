const TABS = [
  { id:'analyze',   label:'Freight Analysis',  icon:'📊' },
  { id:'whatif',    label:'What-If Studio',     icon:'🔬' },
  { id:'portintel', label:'Port Intelligence',  icon:'🛰️' },
]

export default function Header({ activeTab, onTabChange }) {
  return (
    <header style={{ position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,48,135,0.15)' }}>

      {/* ── Top bar: white, org name ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #dde3f4' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'8px 16px',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {/* Logo mark */}
            <div style={{ width:48, height:48, background:'#003087', borderRadius:6,
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="32" height="32" viewBox="0 0 32 32">
                <polygon points="16,2 30,28 2,28" fill="#C8A84B" />
                <polygon points="16,8 25,25 7,25"  fill="#003087" />
                <circle cx="16" cy="19" r="3.5"   fill="#C8A84B" />
              </svg>
            </div>
            {/* Org name */}
            <div style={{ borderLeft:'1px solid #dde3f4', paddingLeft:14 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'#003087', lineHeight:1.3 }}>
                Steel Authority of India Limited (SAIL)
              </div>
              <div style={{ fontSize:11, color:'#888', lineHeight:1.3 }}>
                Ministry of Steel · Government of India · Freight Intelligence Platform
              </div>
            </div>
          </div>
          {/* Right side */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#888' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e',
                             display:'inline-block', animation:'pulse 2s infinite' }} />
              System Online
            </div>
            <div style={{ background:'#003087', color:'white', fontSize:11, fontWeight:600,
                          padding:'4px 12px', borderRadius:4 }}>
              SIH 2026 · Problem SIH26006
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav bar: navy ── */}
      <div style={{ background:'#003087' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 16px',
                      display:'flex', alignItems:'stretch', justifyContent:'space-between' }}>

          {/* Platform title */}
          <div style={{ padding:'12px 20px 12px 0', borderRight:'1px solid rgba(255,255,255,0.15)',
                        display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'0.05em' }}>
              FREIGHT INTELLIGENCE PLATFORM
            </div>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:11, marginTop:2 }}>
              Bulk Cargo Procurement · East Coast India
            </div>
          </div>

          {/* Tabs */}
          <nav style={{ display:'flex', alignItems:'stretch' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => onTabChange(t.id)}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'0 22px', border:'none', background:'transparent',
                  cursor:'pointer', fontSize:13, fontWeight:600,
                  color: activeTab === t.id ? 'white' : 'rgba(255,255,255,0.6)',
                  borderBottom: activeTab === t.id ? '3px solid #C8A84B' : '3px solid transparent',
                  transition:'all 0.15s',
                  marginBottom: activeTab === t.id ? 0 : 0,
                }}
                onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                <span style={{ fontSize:15 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Port info */}
          <div style={{ padding:'12px 0 12px 20px', borderLeft:'1px solid rgba(255,255,255,0.15)',
                        display:'flex', flexDirection:'column', justifyContent:'center', textAlign:'right' }}>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10 }}>PROCUREMENT PORTS</div>
            <div style={{ color:'white', fontSize:11, fontWeight:500, marginTop:2 }}>
              Paradip · Vizag · Gangavaram · Dhamra · Haldia
            </div>
          </div>
        </div>
      </div>

      {/* Gold accent */}
      <div style={{ height:3, background:'linear-gradient(90deg, #C8A84B, #e0c06a, #C8A84B)' }} />
    </header>
  )
}
