/**
 * PortDashboard — Full sub-page shown when user clicks a port on the map.
 * Shows port status, congestion, vessel queue, capacity, auto-divert logic.
 */
import { useEffect, useState } from 'react'
import { apiFetch } from '../config'

const PORT_META = {
  INPRD:{ name:'Paradip',       state:'Odisha',         maxDraft:17.0, berths:12, annualCap:100, lat:20.317, lon:86.611 },
  INVTZ:{ name:'Visakhapatnam', state:'Andhra Pradesh', maxDraft:14.5, berths:10, annualCap:80,  lat:17.686, lon:83.282 },
  INGVP:{ name:'Gangavaram',    state:'Andhra Pradesh', maxDraft:18.0, berths:8,  annualCap:64,  lat:17.623, lon:83.226 },
  INGPL:{ name:'Gopalpur',      state:'Odisha',         maxDraft:12.5, berths:4,  annualCap:20,  lat:19.263, lon:84.893 },
  INDMA:{ name:'Dhamra',        state:'Odisha',         maxDraft:16.5, berths:6,  annualCap:50,  lat:20.892, lon:86.879 },
  INHAL:{ name:'Haldia',        state:'West Bengal',    maxDraft:8.5,  berths:9,  annualCap:45,  lat:22.026, lon:88.069 },
}

const NEARBY = {
  INPRD:['INGPL','INDMA','INGVP'],
  INVTZ:['INGVP','INGPL','INPRD'],
  INGVP:['INVTZ','INGPL','INPRD'],
  INGPL:['INVTZ','INGVP','INDMA'],
  INDMA:['INPRD','INGPL','INHAL'],
  INHAL:['INDMA','INPRD','INGPL'],
}

const VESSEL_DRAFTS = {
  Handymax:11.5, Supramax:12.5, Ultramax:12.8,
  Panamax:13.5, Kamsarmax:13.8, Capesize:18.2,
}

// Realistic vessel queue — simulated waiting vessels
function generateQueue(portId, month) {
  const seed = portId.charCodeAt(2) + month
  const names = ['MV Sagar Pearl','MV Eastern Star','MV Coal Express','MV India Bulk',
                  'MV Dhamra Spirit','MV Bay Trader','MV Paradip Pride','MV East Wind']
  const types = ['Kamsarmax','Panamax','Supramax','Capesize','Ultramax']
  const origs = ['Australia','Indonesia','Mozambique','Russia','USA']
  const count = 3 + (seed % 5)
  return Array.from({ length: count }, (_, i) => ({
    name:    names[(seed + i) % names.length],
    type:    types[(seed + i) % types.length],
    origin:  origs[(seed + i) % origs.length],
    eta:     `+${1 + ((seed + i) % 5)} days`,
    cargo:   `${50 + ((seed + i * 7) % 120)}k MT`,
    status:  i === 0 ? 'BERTHING' : i === 1 ? 'AT ANCHOR' : 'APPROACHING',
  }))
}

// Transfer records — simulated divert history
const TRANSFER_RECORDS = [
  { date:'2026-09-03', vessel:'MV Coal Star', from:'INHAL', to:'INDMA', reason:'Draft excess (14.2m > 8.5m)', status:'DIVERTED' },
  { date:'2026-09-01', vessel:'MV Panamax King', from:'INGPL', to:'INVTZ', reason:'Berth congestion', status:'DIVERTED' },
  { date:'2026-08-28', vessel:'MV Eastern Light', from:'INVTZ', to:'INGVP', reason:'Equipment maintenance', status:'DIVERTED' },
]

export default function PortDashboard({ portId, vesselData, month = 11, onBack }) {
  const port      = PORT_META[portId] || PORT_META.INPRD
  const [intel,   setIntel]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/whatif/port-intelligence?month=${month}`)
      .then(d => {
        const report = d.reports.find(r => r.port_id === portId)
        setIntel(report)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [portId, month])

  const cong        = intel?.congestion || {}
  const weather     = intel?.weather    || {}
  const util        = cong.utilisation_pct || 42
  const waiting     = cong.vessels_waiting || 5
  const avgWait     = cong.avg_wait_days   || 2.5
  const congLevel   = cong.level           || 'MEDIUM'
  const alertLevel  = intel?.alert_level   || 'LOW'
  const aiInsight   = intel?.ai_insight    || 'Port operating normally.'
  const delayCostInr= intel?.delay_cost_inr|| 0

  // Vessel compatibility check
  const vType   = vesselData?.vessel_type || 'Kamsarmax'
  const vDraft  = VESSEL_DRAFTS[vType] || 13.8
  const vDWT    = vesselData?.dwt || 82000
  const compatible = vDraft <= port.maxDraft
  const divertList = !compatible
    ? (NEARBY[portId] || [])
        .map(id => ({ id, ...PORT_META[id] }))
        .filter(p => p.maxDraft >= vDraft)
    : []

  const queue = generateQueue(portId, month)

  const LEVEL_COLOR = { LOW:'#1b5e20', MEDIUM:'#e65100', HIGH:'#b71c1c', CRITICAL:'#7b1fa2' }
  const LEVEL_BG    = { LOW:'#e8f5e9', MEDIUM:'#fff8e1', HIGH:'#ffebee', CRITICAL:'#f3e5f5' }
  const LEVEL_BRD   = { LOW:'#a5d6a7', MEDIUM:'#ffe082', HIGH:'#ef9a9a', CRITICAL:'#ce93d8' }

  const hdrColor = compatible ? '#003087' : '#b71c1c'

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8', paddingBottom:48 }}>

      {/* Sub-page header */}
      <div style={{ background: hdrColor, padding:'14px 32px',
                    display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onBack}
          style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white',
                   padding:'7px 16px', borderRadius:6, cursor:'pointer', fontSize:12,
                   fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          &#8592; Back to Map
        </button>
        <div style={{ width:1, height:28, background:'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:17 }}>
            {port.name} Port Dashboard
          </div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, marginTop:1 }}>
            {port.state} &nbsp;&middot;&nbsp; East Coast India &nbsp;&middot;&nbsp; Max Draft {port.maxDraft}m
          </div>
        </div>
        {!compatible && (
          <div style={{ marginLeft:'auto', background:'rgba(255,255,255,0.15)',
                        padding:'8px 16px', borderRadius:6, border:'1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ color:'#ffcc80', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>
              DIVERT REQUIRED
            </div>
            <div style={{ color:'white', fontSize:12, fontWeight:700, marginTop:2 }}>
              Vessel draft {vDraft}m &gt; Port limit {port.maxDraft}m
            </div>
          </div>
        )}
        {compatible && (
          <div style={{ marginLeft:'auto', background:'rgba(255,255,255,0.1)',
                        padding:'8px 16px', borderRadius:6 }}>
            <div style={{ color:'#C8A84B', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>
              PORT STATUS
            </div>
            <div style={{ color:'white', fontSize:13, fontWeight:800, marginTop:2 }}>
              {alertLevel} RISK
            </div>
          </div>
        )}
      </div>
      <div style={{ height:3, background:'linear-gradient(90deg,#C8A84B,#e0c06a,#C8A84B)' }} />

      <div style={{ maxWidth:1100, margin:'28px auto', padding:'0 20px',
                    display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── KPI row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
          {[
            { l:'Berths Available', v:`${port.berths}`,         sub:'Total capacity',        color:'#003087' },
            { l:'Vessels Waiting',  v:`${waiting}`,             sub:'At anchor / approaching',color: waiting > 8 ? '#b71c1c' : '#e65100' },
            { l:'Avg Wait Time',    v:`${avgWait}d`,            sub:'Days to berth',          color: avgWait > 4 ? '#b71c1c' : '#1b5e20' },
            { l:'Berth Utilisation',v:`${util}%`,               sub:'Current occupancy',      color: util > 65 ? '#b71c1c' : '#003087' },
            { l:'Annual Capacity',  v:`${port.annualCap} MT`,   sub:'Million tonnes/year',    color:'#003087' },
          ].map(k => (
            <div key={k.l} className="card" style={{ padding:'14px 16px', borderLeft:`4px solid ${k.color}` }}>
              <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                            letterSpacing:'0.07em', marginBottom:6 }}>{k.l}</div>
              <div style={{ fontSize:22, fontWeight:900, color:k.color, lineHeight:1 }}>{k.v}</div>
              <div style={{ fontSize:10, color:'#6b7a9e', marginTop:4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── AI insight + Congestion ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

          {/* Congestion card */}
          <div className="card" style={{ padding:'20px 24px', overflow:'hidden' }}>
            <SectionTitle>Port Congestion Status</SectionTitle>
            <div style={{ background:LEVEL_BG[congLevel] || '#f5f7fc',
                          border:`1px solid ${LEVEL_BRD[congLevel] || '#dde3f4'}`,
                          borderRadius:7, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:800, fontSize:20,
                               color:LEVEL_COLOR[congLevel] || '#003087' }}>
                  {congLevel}
                </span>
                <span style={{ fontSize:12, color:LEVEL_COLOR[congLevel] || '#003087',
                               fontWeight:700 }}>
                  {util}% Berth Utilisation
                </span>
              </div>
              <div style={{ fontSize:11, color:'#6b7a9e', marginTop:6 }}>{aiInsight}</div>
            </div>

            {/* Utilisation bar */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11,
                            color:'#6b7a9e', marginBottom:5 }}>
                <span>Berth Utilisation</span>
                <span style={{ fontWeight:700 }}>{util}% occupied</span>
              </div>
              <div style={{ background:'#e8ecf4', borderRadius:6, height:10, overflow:'hidden' }}>
                <div style={{ height:10, borderRadius:6,
                              background: util > 65 ? '#d32f2f' : util > 40 ? '#f57c00' : '#2e7d32',
                              width:`${util}%`, transition:'width 0.5s' }} />
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                { l:'Congestion',   v:congLevel,      color: LEVEL_COLOR[congLevel] },
                { l:'Weather Risk', v:weather.level || 'LOW', color: weather.level === 'HIGH' ? '#b71c1c' : '#1b5e20' },
                { l:'Delay Cost',   v:`₹${(delayCostInr/1e5).toFixed(1)}L`, color:'#e65100' },
              ].map(s => (
                <div key={s.l} style={{ background:'#f5f7fc', border:'1px solid #dde3f4',
                                         borderRadius:6, padding:'9px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                                letterSpacing:'0.06em', marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vessel compatibility */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <SectionTitle>Vessel Compatibility Check</SectionTitle>
            <div style={{ background: compatible ? '#e3f2fd' : '#ffebee',
                          border:`1px solid ${compatible ? '#90caf9' : '#ef9a9a'}`,
                          borderRadius:7, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:11, color:'#6b7a9e', marginBottom:3 }}>
                    {vType} ({vDWT.toLocaleString()} DWT)
                  </div>
                  <div style={{ fontWeight:800, fontSize:16,
                                color: compatible ? '#0d47a1' : '#b71c1c' }}>
                    {compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}
                  </div>
                </div>
                <div style={{ textAlign:'right', fontSize:12 }}>
                  <div style={{ color:'#6b7a9e' }}>Vessel draft</div>
                  <div style={{ fontWeight:800, fontSize:18,
                                color: compatible ? '#1b5e20' : '#b71c1c' }}>
                    {vDraft}m
                  </div>
                  <div style={{ color:'#6b7a9e', fontSize:11 }}>Port max: {port.maxDraft}m</div>
                </div>
              </div>
            </div>

            {/* Port specs */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { l:'Max Draft',     v:`${port.maxDraft}m` },
                { l:'Berths',        v:`${port.berths}` },
                { l:'Annual Cap.',   v:`${port.annualCap}M MT` },
                { l:'Lightering',    v: portId === 'INHAL' ? 'Required' : 'Not needed' },
              ].map(s => (
                <div key={s.l} style={{ background:'#f5f7fc', border:'1px solid #dde3f4',
                                         borderRadius:6, padding:'9px 12px' }}>
                  <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                                letterSpacing:'0.07em', marginBottom:3 }}>{s.l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#003087' }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Vessel Queue ── */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ background:'#003087', padding:'12px 20px',
                        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:'white', fontWeight:700, fontSize:12,
                           textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Vessel Queue — Current Waiting Vessels
            </span>
            <span style={{ color:'#C8A84B', fontSize:11, fontWeight:600 }}>
              {queue.length} vessels waiting · Avg {avgWait}d
            </span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Vessel Name','Type','Origin','Cargo','ETA','Status'].map(h => (
                  <th key={h} style={{ background:'#f5f7fc', padding:'9px 14px', textAlign:'left',
                                       fontSize:10, fontWeight:700, color:'#6b7a9e',
                                       textTransform:'uppercase', letterSpacing:'0.06em',
                                       borderBottom:'1px solid #dde3f4' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((v, i) => {
                const sColor = v.status === 'BERTHING' ? '#1b5e20' :
                               v.status === 'AT ANCHOR' ? '#e65100' : '#0277bd'
                const sBg    = v.status === 'BERTHING' ? '#e8f5e9' :
                               v.status === 'AT ANCHOR' ? '#fff8e1' : '#e3f2fd'
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #eef1fa',
                                        background: i % 2 === 0 ? 'white' : '#fafbff' }}>
                    <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700,
                                  color:'#003087' }}>{v.name}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#1a2340' }}>{v.type}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#1a2340' }}>{v.origin}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#1a2340' }}>{v.cargo}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, fontWeight:600,
                                  color:'#003087' }}>{v.eta}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:sBg, color:sColor, border:`1px solid ${sColor}40`,
                                      padding:'3px 8px', borderRadius:4, fontSize:10,
                                      fontWeight:700 }}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Auto-Divert Section ── */}
        {!compatible && divertList.length > 0 && (
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ background:'#e65100', padding:'12px 20px',
                          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'white', fontWeight:700, fontSize:12,
                             textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Auto-Divert — Recommended Alternate Ports
              </span>
              <span style={{ color:'rgba(255,255,255,0.8)', fontSize:11 }}>
                {vType} ({vDraft}m draft) cannot berth at {port.name} ({port.maxDraft}m)
              </span>
            </div>
            <div style={{ padding:20, display:'grid',
                          gridTemplateColumns:`repeat(${divertList.length},1fr)`, gap:16 }}>
              {divertList.map(dp => (
                <div key={dp.id} style={{ background:'white', border:'2px solid #C8A84B',
                                           borderRadius:8, padding:'16px 18px' }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'#003087',
                                marginBottom:6 }}>{dp.name}</div>
                  <div style={{ fontSize:11, color:'#6b7a9e', marginBottom:12 }}>{dp.state}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { l:'Max Draft', v:`${dp.maxDraft}m`, ok:dp.maxDraft >= vDraft },
                      { l:'Berths',    v:`${dp.berths}`,    ok:true },
                    ].map(s => (
                      <div key={s.l} style={{ background:'#f5f7fc', borderRadius:5,
                                               padding:'8px 10px' }}>
                        <div style={{ fontSize:9, color:'#6b7a9e', marginBottom:2 }}>{s.l}</div>
                        <div style={{ fontSize:13, fontWeight:700,
                                       color: s.ok ? '#1b5e20' : '#b71c1c' }}>
                          {s.ok ? '✓ ' : ''}{s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:10, fontSize:11, color:'#1b5e20',
                                fontWeight:600, background:'#e8f5e9',
                                padding:'5px 10px', borderRadius:4 }}>
                    Compatible — can accommodate {vType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Port Transfer Records ── */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ background:'#003087', padding:'12px 20px' }}>
            <span style={{ color:'white', fontWeight:700, fontSize:12,
                           textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Port Transfer Records — Recent Diversions
            </span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Date','Vessel','From Port','To Port','Reason','Status'].map(h => (
                  <th key={h} style={{ background:'#f5f7fc', padding:'9px 14px', textAlign:'left',
                                       fontSize:10, fontWeight:700, color:'#6b7a9e',
                                       textTransform:'uppercase', letterSpacing:'0.06em',
                                       borderBottom:'1px solid #dde3f4' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSFER_RECORDS.map((r, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #eef1fa',
                                      background: i % 2 === 0 ? 'white' : '#fafbff' }}>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#6b7a9e' }}>{r.date}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700,
                                color:'#003087' }}>{r.vessel}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#1a2340' }}>
                    {PORT_META[r.from]?.name || r.from}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:600,
                                color:'#1b5e20' }}>
                    {PORT_META[r.to]?.name || r.to}
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'#6b7a9e' }}>{r.reason}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ background:'#fff8e1', color:'#e65100',
                                    border:'1px solid #ffe082', padding:'2px 8px',
                                    borderRadius:4, fontSize:10, fontWeight:700 }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
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
