export default function SavingsCard({ data, usdInr }) {
  const { total_saving_usd, total_saving_inr, per_tonne_usd, per_tonne_inr,
          contract_saving_usd, vessel_opt_saving_usd, breakdown_note } = data
  const lakhs = (total_saving_inr / 1_00_000).toFixed(1)

  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ background:'#003087', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span>💰</span>
          <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Estimated Savings Opportunity
          </span>
        </div>
        <span style={{ color:'#C8A84B', fontSize:11, fontWeight:600 }}>vs Reactive Spot Procurement</span>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      <div style={{ padding:'20px', background:'#f8f9fd' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:16 }}>
          {/* Hero */}
          <div style={{ background:'#003087', borderRadius:8, padding:'18px 20px', textAlign:'center' }}>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
              Total Saving (INR)
            </div>
            <div style={{ color:'white', fontWeight:900, fontSize:36, lineHeight:1 }}>
              ₹{lakhs}<span style={{ fontSize:18 }}> L</span>
            </div>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginTop:6 }}>
              ${total_saving_usd.toLocaleString()} USD
            </div>
          </div>

          {/* Per tonne */}
          <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:8, padding:'14px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Per Tonne</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#003087' }}>₹{per_tonne_inr.toFixed(0)}</div>
            <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>${per_tonne_usd.toFixed(2)}/MT</div>
          </div>

          {/* Exchange rate */}
          <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:8, padding:'14px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>USD / INR</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#003087' }}>₹{usdInr.toFixed(2)}</div>
            <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>Exchange Rate</div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          {[
            { label:'Contract Optimisation',  usd: contract_saving_usd,   color:'#003087' },
            { label:'Vessel Selection Saving', usd: vessel_opt_saving_usd, color:'#C8A84B' },
          ].map(b => (
            <div key={b.label} style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7, padding:'12px' }}>
              <div style={{ fontSize:11, color:'#6b7a9e', marginBottom:5 }}>{b.label}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#003087' }}>${b.usd.toLocaleString()}</div>
              <div style={{ fontSize:11, color:'#6b7a9e', marginBottom:8 }}>₹{(b.usd * usdInr / 1_00_000).toFixed(1)}L</div>
              <div style={{ background:'#e8ecf4', borderRadius:4, height:5, overflow:'hidden' }}>
                <div style={{ height:5, background:b.color, borderRadius:4, width:'70%' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize:11, color:'#6b7a9e', lineHeight:1.65 }}>{breakdown_note}</div>
      </div>
    </div>
  )
}
