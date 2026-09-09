const CII = {
  A: { bg:'#e8f5e9', text:'#1b5e20', border:'#a5d6a7' },
  B: { bg:'#f1f8e9', text:'#33691e', border:'#c5e1a5' },
  C: { bg:'#fff8e1', text:'#e65100', border:'#ffe082' },
  D: { bg:'#fff3e0', text:'#bf360c', border:'#ffcc80' },
  E: { bg:'#ffebee', text:'#b71c1c', border:'#ef9a9a' },
}

export default function VesselCard({ data }) {
  const { vessel_type, dwt, voyages_needed, sea_days, cost_per_tonne, total_voyage_cost_usd, cii_grade, reason } = data
  const cii = CII[cii_grade] || CII.C

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Recommended Vessel</span>
      </div>
      <div style={{ padding:16 }}>
        {/* Hero */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:24, fontWeight:900, color:'#003087' }}>{vessel_type}</div>
            <div style={{ fontSize:12, color:'#6b7a9e', marginTop:2 }}>
              {(dwt / 1000).toFixed(0)}k DWT &nbsp;·&nbsp; {voyages_needed} Voyage{voyages_needed > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ background:cii.bg, border:`1px solid ${cii.border}`, color:cii.text,
                        padding:'6px 14px', borderRadius:6, fontSize:13, fontWeight:700 }}>
            IMO CII: {cii_grade}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
          {[
            { label:'DWT Capacity',  value:`${(dwt/1000).toFixed(0)}k MT` },
            { label:'Sea Days',      value:`${sea_days} days` },
            { label:'Cost / MT',     value:`$${cost_per_tonne.toFixed(2)}`, highlight:true },
            { label:'Total Cost',    value:`$${(total_voyage_cost_usd/1000).toFixed(0)}k` },
          ].map(s => (
            <div key={s.label} style={{ background:'#f5f7fc', border:'1px solid #dde3f4', borderRadius:6, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:14, fontWeight:700, color: s.highlight ? '#003087' : '#1a2340' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:11, color:'#6b7a9e', lineHeight:1.65, paddingTop:10, borderTop:'1px solid #eef1fa' }}>
          {reason}
        </div>
      </div>
    </div>
  )
}
