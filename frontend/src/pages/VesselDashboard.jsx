/**
 * VesselDashboard — Full sub-page shown when user clicks the vessel on the map.
 * Displays complete voyage details, progress, costs, CII, and fuel breakdown.
 */
export default function VesselDashboard({ vesselData, originId, destPortId, vesselPct, onBack }) {
  const ORIGINS = {
    AU:'Newcastle, Australia', ID:'Samarinda, Indonesia',
    US:'Norfolk, United States', MZ:'Maputo, Mozambique', RU:'Taman, Russia',
  }
  const PORTS = {
    INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram',
    INGPL:'Gopalpur', INDMA:'Dhamra', INHAL:'Haldia',
  }
  const DIST  = { AU:'4,800', ID:'2,200', US:'11,500', MZ:'5,600', RU:'7,200' }
  const TIME  = { AU:'15 days', ID:'7 days', US:'35 days', MZ:'17 days', RU:'22 days' }

  const v     = vesselData || {}
  const usdInr= 84.20

  const CII_COLOR = {
    A:'#1b5e20', B:'#2e7d32', C:'#f57f17', D:'#e65100', E:'#b71c1c',
  }
  const CII_BG = {
    A:'#e8f5e9', B:'#f1f8e9', C:'#fffde7', D:'#fff3e0', E:'#ffebee',
  }
  const cii   = v.cii_grade || 'C'

  // Fuel breakdown
  const fuelMT   = v.fuel_consumption_mt  || 540
  const fuelCost = Math.round(fuelMT * 580)
  const hireCost = v.total_voyage_cost_usd
    ? Math.round(v.total_voyage_cost_usd - fuelCost - fuelMT * 3.17 * 30)
    : 420000
  const carbonCost = Math.round(fuelMT * 3.17 * 30)
  const totalCost  = v.total_voyage_cost_usd || (fuelCost + hireCost + carbonCost)

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8', paddingBottom:40 }}>

      {/* Sub-page header */}
      <div style={{ background:'#003087', padding:'14px 32px',
                    display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onBack}
          style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white',
                   padding:'7px 16px', borderRadius:6, cursor:'pointer', fontSize:12,
                   fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          &#8592; Back to Map
        </button>
        <div style={{ width:1, height:28, background:'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:16 }}>Vessel Dashboard</div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:1 }}>
            In-transit voyage intelligence · {ORIGINS[originId]} → {PORTS[destPortId]}
          </div>
        </div>
        <div style={{ marginLeft:'auto', background:'rgba(255,255,255,0.1)',
                      padding:'6px 16px', borderRadius:6, textAlign:'right' }}>
          <div style={{ color:'#C8A84B', fontSize:11, fontWeight:700 }}>
            VOYAGE PROGRESS
          </div>
          <div style={{ color:'white', fontSize:18, fontWeight:900 }}>{vesselPct}%</div>
        </div>
      </div>
      <div style={{ height:3, background:'linear-gradient(90deg,#C8A84B,#e0c06a,#C8A84B)' }} />

      <div style={{ maxWidth:1100, margin:'28px auto', padding:'0 20px',
                    display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Top hero row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16 }}>
          <HeroCard
            title="Vessel Type"
            value={v.vessel_type || 'Kamsarmax'}
            sub={`${(v.dwt||82000).toLocaleString()} DWT`}
            icon="V"
            color="#003087"
          />
          <HeroCard
            title="Cargo on Board"
            value={`${(v.cargo_mt||80000).toLocaleString()} MT`}
            sub={`${((v.cargo_mt||80000)/1000).toFixed(0)}k Metric Tonnes`}
            icon="C"
            color="#1565c0"
          />
          <HeroCard
            title="Days at Sea"
            value={`${v.sea_days || 14} days`}
            sub={`Total voyage: ${TIME[originId]}`}
            icon="D"
            color="#0277bd"
          />
          <HeroCard
            title="IMO CII Grade"
            value={cii}
            sub="Carbon Intensity"
            icon="E"
            color={CII_COLOR[cii]}
            bg={CII_BG[cii]}
          />
        </div>

        {/* ── Voyage progress card ── */}
        <div className="card" style={{ padding:'20px 24px' }}>
          <SectionTitle>Voyage Progress</SectionTitle>
          <div style={{ display:'flex', justifyContent:'space-between',
                        fontSize:12, color:'#6b7a9e', marginBottom:8 }}>
            <span style={{ fontWeight:700, color:'#003087' }}>{ORIGINS[originId]}</span>
            <span style={{ fontWeight:700, color:'#6b7a9e' }}>En Route — {DIST[originId]} NM</span>
            <span style={{ fontWeight:700, color:'#003087' }}>{PORTS[destPortId]}</span>
          </div>
          <div style={{ background:'#e8ecf4', borderRadius:8, height:14, overflow:'hidden', position:'relative' }}>
            <div style={{ height:14, background:'linear-gradient(90deg,#003087,#1565c0)',
                          borderRadius:8, width:`${vesselPct}%`, transition:'width 0.5s',
                          position:'relative' }}>
              <div style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
                            width:20, height:20, borderRadius:'50%', background:'#C8A84B',
                            border:'3px solid white', marginRight:-10,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:8, fontWeight:800, color:'white', fontFamily:'Arial,sans-serif' }}>
                V
              </div>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between',
                        marginTop:8, fontSize:11, color:'#6b7a9e' }}>
            <span>0%</span>
            <span style={{ fontWeight:700, color:'#003087', fontSize:13 }}>
              {vesselPct}% Complete
            </span>
            <span>100%</span>
          </div>

          {/* Route details */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginTop:20 }}>
            {[
              { l:'Origin Port',     v: ORIGINS[originId] },
              { l:'Destination',     v: PORTS[destPortId] },
              { l:'Total Distance',  v: `${DIST[originId]} NM` },
              { l:'Sailing Time',    v: TIME[originId] },
              { l:'Vessel Status',   v: vesselPct < 100 ? 'IN TRANSIT' : 'ARRIVED' },
            ].map(s => (
              <div key={s.l} style={{ background:'#f5f7fc', border:'1px solid #dde3f4',
                                       borderRadius:6, padding:'10px 12px' }}>
                <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                              letterSpacing:'0.07em', marginBottom:4 }}>{s.l}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#003087' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cost breakdown + Vessel specs ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Cost breakdown */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <SectionTitle>Voyage Cost Breakdown</SectionTitle>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                            alignItems:'flex-end', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'#6b7a9e' }}>Total Voyage Cost</span>
                <span style={{ fontSize:22, fontWeight:900, color:'#003087' }}>
                  ${totalCost.toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize:11, color:'#6b7a9e' }}>
                ₹{(totalCost * usdInr / 1_00_000).toFixed(1)} Lakhs @ ₹{usdInr}/USD
              </div>
            </div>

            {/* Cost bars */}
            {[
              { l:'Vessel Hire',    v:hireCost,    color:'#003087', pct:Math.round(hireCost/totalCost*100) },
              { l:'Bunker Fuel',    v:fuelCost,    color:'#1565c0', pct:Math.round(fuelCost/totalCost*100) },
              { l:'Carbon Levy',   v:carbonCost,  color:'#0288d1', pct:Math.round(carbonCost/totalCost*100) },
            ].map(b => (
              <div key={b.l} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                              fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'#1a2340', fontWeight:600 }}>{b.l}</span>
                  <span style={{ color:'#003087', fontWeight:700 }}>
                    ${b.v.toLocaleString()} <span style={{ color:'#6b7a9e', fontWeight:400 }}>({b.pct}%)</span>
                  </span>
                </div>
                <div style={{ background:'#e8ecf4', borderRadius:4, height:7, overflow:'hidden' }}>
                  <div style={{ height:7, background:b.color, borderRadius:4, width:`${b.pct}%` }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid #eef1fa' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'#6b7a9e' }}>Cost per Tonne</span>
                <span style={{ fontWeight:800, color:'#003087', fontSize:14 }}>
                  ${v.cost_per_tonne || (totalCost/(v.cargo_mt||80000)).toFixed(2)}/MT
                </span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:6 }}>
                <span style={{ color:'#6b7a9e' }}>Fuel Consumption</span>
                <span style={{ fontWeight:700, color:'#1a2340' }}>{fuelMT} MT VLSFO</span>
              </div>
            </div>
          </div>

          {/* Vessel specs */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <SectionTitle>Vessel Specifications</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { l:'Vessel Type',    v: v.vessel_type || 'Kamsarmax' },
                { l:'DWT',            v: `${(v.dwt||82000).toLocaleString()} MT` },
                { l:'Voyages Needed', v: `${v.voyages_needed || 1} voyage(s)` },
                { l:'Speed',          v: '14.0 knots' },
                { l:'Draft',          v: `${v.draft_m || 13.8} m` },
                { l:'Fuel Type',      v: 'VLSFO (IMO 2020)' },
                { l:'IMO CII Grade',  v: cii },
                { l:'GARCH Forecast', v: 'Model-based' },
              ].map(s => (
                <div key={s.l} style={{ background:'#f5f7fc', border:'1px solid #dde3f4',
                                         borderRadius:6, padding:'9px 12px' }}>
                  <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                                letterSpacing:'0.07em', marginBottom:3 }}>{s.l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#003087' }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* CII grade display */}
            <div style={{ marginTop:14, background:CII_BG[cii],
                          border:`1px solid ${CII_COLOR[cii]}40`,
                          borderRadius:7, padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:'#6b7a9e' }}>IMO 2026 Carbon Intensity Indicator</div>
                  <div style={{ fontSize:22, fontWeight:900, color:CII_COLOR[cii], marginTop:2 }}>
                    Grade {cii}
                  </div>
                </div>
                <div style={{ fontSize:11, color:CII_COLOR[cii], maxWidth:160, textAlign:'right' }}>
                  {cii === 'A' || cii === 'B'
                    ? 'Excellent — well within IMO limits'
                    : cii === 'C'
                    ? 'Acceptable — meets IMO standards'
                    : 'Below standard — carbon levy applies'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function HeroCard({ title, value, sub, icon, color, bg }) {
  return (
    <div className="card" style={{ padding:'18px 20px', borderLeft:`4px solid ${color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#6b7a9e',
                      textTransform:'uppercase', letterSpacing:'0.08em' }}>{title}</div>
        <div style={{ width:32, height:32, borderRadius:6, background: bg || `${color}15`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:16, color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:'#6b7a9e', marginTop:5 }}>{sub}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize:12, fontWeight:800, color:'#003087', textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:16, paddingBottom:8,
                  borderBottom:'2px solid #003087', display:'inline-block' }}>
      {children}
    </div>
  )
}
