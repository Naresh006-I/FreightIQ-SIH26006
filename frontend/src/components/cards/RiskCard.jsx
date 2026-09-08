const LVL = {
  LOW:    { bg:'#e8f5e9', text:'#1b5e20', border:'#a5d6a7' },
  MEDIUM: { bg:'#fff8e1', text:'#e65100', border:'#ffe082' },
  HIGH:   { bg:'#ffebee', text:'#b71c1c', border:'#ef9a9a' },
}
const BD = {
  market_risk:'Market Risk', seasonal_risk:'Seasonal Risk',
  congestion_risk:'Congestion', geopolitical:'Geopolitical', bunker_risk:'Bunker Risk',
}

export default function RiskCard({ data }) {
  const { overall_score, level, factors, breakdown, var_95_usd, mitigation } = data
  const s = LVL[level] || LVL.MEDIUM

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span>⚠️</span>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Risk Assessment</span>
      </div>
      <div style={{ padding:16 }}>

        {/* Overall */}
        <div style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:7,
                      padding:'12px 14px', display:'flex', justifyContent:'space-between',
                      alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>Overall Risk Level</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.text }}>{level}</div>
          </div>
          <div style={{ fontSize:30, fontWeight:900, color:s.text }}>
            {overall_score}<span style={{ fontSize:14, fontWeight:400 }}>/100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
          {Object.entries(breakdown).map(([k, v]) => (
            <div key={k}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                <span style={{ color:'#6b7a9e' }}>{BD[k] || k}</span>
                <span style={{ fontWeight:600, color:'#1a2340' }}>{v}</span>
              </div>
              <div style={{ background:'#e8ecf4', borderRadius:4, height:5, overflow:'hidden' }}>
                <div style={{
                  height:5, borderRadius:4,
                  background: v > 60 ? '#e53935' : v > 35 ? '#ffa726' : '#43a047',
                  width:`${v}%`, transition:'width 0.4s',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* VaR */}
        <div style={{ background:'#f5f7fc', border:'1px solid #dde3f4', borderRadius:6,
                      padding:'9px 12px', display:'flex', justifyContent:'space-between',
                      alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:11, color:'#6b7a9e', fontWeight:600 }}>Value at Risk (95% Confidence)</span>
          <span style={{ fontSize:14, fontWeight:800, color:'#003087' }}>${var_95_usd.toLocaleString()}</span>
        </div>

        {/* Factors */}
        <div style={{ marginBottom:10 }}>
          {factors.map((f, i) => (
            <div key={i} style={{ fontSize:11, color:s.text, display:'flex', gap:6, marginBottom:4 }}>
              <span style={{ flexShrink:0 }}>•</span>{f}
            </div>
          ))}
        </div>

        <div style={{ background:'#e3f2fd', border:'1px solid #90caf9', borderRadius:6,
                      padding:'8px 12px', fontSize:11, color:'#0d47a1' }}>
          💡 {mitigation}
        </div>
      </div>
    </div>
  )
}
