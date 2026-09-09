export default function ContractCard({ data }) {
  const { recommended_type, recommended_rate, recommended_cost_usd, saving_vs_spot_usd, rationale, options } = data
  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Contract Recommendation</span>
      </div>
      <div style={{ padding:16 }}>

        {/* Recommended */}
        <div style={{ background:'#003087', borderRadius:7, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>SAIL Recommended</div>
          <div style={{ color:'white', fontWeight:900, fontSize:18, marginTop:3 }}>{recommended_type}</div>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:3 }}>
            ${recommended_rate}/MT &nbsp;·&nbsp; Total ${(recommended_cost_usd / 1_000_000).toFixed(2)}M
          </div>
        </div>

        {/* Options */}
        <div style={{ border:'1px solid #dde3f4', borderRadius:6, overflow:'hidden', marginBottom:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto',
                        background:'#f5f7fc', padding:'7px 12px', borderBottom:'1px solid #dde3f4' }}>
            {['Contract Type','Rate','Discount'].map(h => (
              <span key={h} style={{ fontSize:10, fontWeight:700, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</span>
            ))}
          </div>
          {options.map((opt, i) => {
            const isRec = opt.type === recommended_type
            return (
              <div key={i} style={{
                display:'grid', gridTemplateColumns:'1fr auto auto',
                padding:'9px 12px', alignItems:'center',
                borderBottom: i < options.length - 1 ? '1px solid #eef1fa' : 'none',
                background: isRec ? '#eff6ff' : 'white',
              }}>
                <span style={{ fontSize:12, fontWeight: isRec ? 700 : 500, color: isRec ? '#003087' : '#1a2340' }}>
                  {isRec && <span style={{ color:'#C8A84B', marginRight:5 }}>★</span>}
                  {opt.type}
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:'#1a2340', marginRight:24 }}>${opt.rate}/MT</span>
                <span style={{ fontSize:12, fontWeight:700, color: opt.discount_pct > 0 ? '#1b5e20' : '#6b7a9e' }}>
                  {opt.discount_pct > 0 ? `-${opt.discount_pct}%` : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Saving */}
        {saving_vs_spot_usd > 0 && (
          <div style={{ background:'#e8f5e9', border:'1px solid #a5d6a7', borderRadius:6,
                        padding:'9px 12px', display:'flex', justifyContent:'space-between',
                        alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:12, color:'#1b5e20', fontWeight:600 }}>Saving vs Spot Market</span>
            <span style={{ fontSize:15, fontWeight:900, color:'#1b5e20' }}>${saving_vs_spot_usd.toLocaleString()}</span>
          </div>
        )}

        <div style={{ fontSize:11, color:'#6b7a9e', lineHeight:1.65 }}>{rationale}</div>
      </div>
    </div>
  )
}
