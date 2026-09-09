const STYLE = {
  green:  { bg:'#e8f5e9', text:'#1b5e20', bar:'#43a047', border:'#a5d6a7' },
  red:    { bg:'#ffebee', text:'#b71c1c', bar:'#e53935', border:'#ef9a9a' },
  yellow: { bg:'#fff8e1', text:'#e65100', bar:'#ffa726', border:'#ffe082' },
}

export default function SignalCard({ data }) {
  const { signal, color, confidence, action, trend_pct, vol_pct } = data
  const s = STYLE[color] || STYLE.yellow

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Market Entry Signal</span>
      </div>
      <div style={{ padding:16 }}>
        {/* Signal display */}
        <div style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:7,
                      padding:'16px', textAlign:'center', marginBottom:12 }}>
          <div style={{ fontSize:26, fontWeight:900, color:s.text, letterSpacing:'0.05em' }}>{signal}</div>
          <div style={{ background:'#e0e0e0', borderRadius:4, height:6, margin:'8px 0 4px', overflow:'hidden' }}>
            <div style={{ height:6, width:`${confidence}%`, background:s.bar, borderRadius:4, transition:'width 0.5s' }} />
          </div>
          <div style={{ fontSize:11, color:'#6b7a9e' }}>{confidence}% Model Confidence</div>
        </div>

        <div style={{ fontSize:13, color:'#1a2340', lineHeight:1.65, marginBottom:14 }}>{action}</div>

        {/* Metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'Rate Trend',  value:`${trend_pct > 0 ? '+' : ''}${trend_pct}%`,
              color: trend_pct < 0 ? '#1b5e20' : '#b71c1c' },
            { label:'Volatility',  value:`${vol_pct.toFixed(1)}%`,
              color: vol_pct < 5 ? '#1b5e20' : vol_pct < 10 ? '#e65100' : '#b71c1c' },
          ].map(m => (
            <div key={m.label} style={{ background:'#f5f7fc', border:'1px solid #dde3f4',
                                         borderRadius:6, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
