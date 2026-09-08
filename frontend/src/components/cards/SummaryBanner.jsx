const COM_LBL = { thermal_coal:'Thermal Coal', coking_coal:'Coking Coal', iron_ore:'Iron Ore', limestone:'Limestone', bauxite:'Bauxite' }
const ORI_LBL = { AU:'Australia', ID:'Indonesia', US:'United States', MZ:'Mozambique', RU:'Russia' }
const PRT_LBL = { INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram', INGPL:'Gopalpur', INDMA:'Dhamra', INHAL:'Haldia' }

const SIG = {
  'BUY NOW': { bg:'#003087', text:'white', dot:'#22c55e' },
  'WAIT':    { bg:'#b71c1c', text:'white', dot:'#ef5350' },
  'CAUTION': { bg:'#e65100', text:'white', dot:'#ffa726' },
}

export default function SummaryBanner({ input, signal, seasonal }) {
  const cfg = SIG[signal.signal] || SIG['CAUTION']
  return (
    <div className="card" style={{ overflow:'hidden', marginBottom:20 }}>
      <div style={{ background:'#003087', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>
          Analysis Summary — SAIL Freight Intelligence Platform
        </span>
        <span style={{ color:'#C8A84B', fontSize:11 }}>SIH26006</span>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      <div style={{ padding:'16px 20px', display:'flex', flexWrap:'wrap', alignItems:'center',
                    justifyContent:'space-between', gap:16, background:'#f8f9fd' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:'#003087' }}>
            {input.quantity_mt.toLocaleString()} MT &nbsp;·&nbsp; {COM_LBL[input.commodity] || input.commodity}
          </div>
          <div style={{ fontSize:13, color:'#6b7a9e', marginTop:5 }}>
            <strong style={{ color:'#1a2340' }}>{ORI_LBL[input.origin_id]}</strong>
            &nbsp;→&nbsp;
            <strong style={{ color:'#1a2340' }}>{PRT_LBL[input.port_id]}</strong>
            &nbsp;·&nbsp; {input.period}
            &nbsp;·&nbsp; {input.contract_months}-month contract
            &nbsp;·&nbsp; {input.route_distance_nm.toLocaleString()} NM
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
            {seasonal.peak_demand && (
              <span style={{ fontSize:11, background:'#fff3e0', color:'#e65100',
                              border:'1px solid #ffcc80', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
                📈 Post-Monsoon Demand Peak
              </span>
            )}
            {seasonal.monsoon && (
              <span style={{ fontSize:11, background:'#e3f2fd', color:'#0d47a1',
                              border:'1px solid #90caf9', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
                🌧️ Monsoon Season Active
              </span>
            )}
          </div>
        </div>

        {/* Signal badge */}
        <div style={{ background:cfg.bg, borderRadius:8, padding:'14px 28px', textAlign:'center', minWidth:130 }}>
          <div style={{ color:cfg.text, fontWeight:900, fontSize:18, letterSpacing:'0.05em' }}>{signal.signal}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot, display:'inline-block' }} />
            <span style={{ color:'rgba(255,255,255,0.8)', fontSize:11 }}>{signal.confidence}% confidence</span>
          </div>
        </div>
      </div>
    </div>
  )
}
