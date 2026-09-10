/**
 * AnalysisHistory — Shows saved analysis records from the SQLite database.
 * Displayed in the Freight Analysis tab below the results.
 */
import { useState, useEffect } from 'react'
import { apiFetch } from '../config'

const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const COMM_LABEL  = {
  thermal_coal:'Thermal Coal', coking_coal:'Coking Coal', iron_ore:'Iron Ore',
  limestone:'Limestone', bauxite:'Bauxite', manganese_ore:'Manganese Ore',
}
const ORIG_LABEL  = {
  AU:'Australia', ID:'Indonesia', US:'USA', MZ:'Mozambique',
  RU:'Russia', BR:'Brazil', ZA:'South Africa', GA:'Gabon',
}
const PORT_LABEL  = {
  INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram', INGPL:'Gopalpur',
  INDMA:'Dhamra',  INHAL:'Haldia',        INCHP:'Chennai',    INKDL:'Kandla',
}
const SIGNAL_COLOR = { 'BUY NOW':'#1b5e20', WAIT:'#b71c1c', CAUTION:'#e65100' }
const SIGNAL_BG    = { 'BUY NOW':'#e8f5e9', WAIT:'#ffebee', CAUTION:'#fff8e1' }
const RISK_COLOR   = { LOW:'#1b5e20', MEDIUM:'#e65100', HIGH:'#b71c1c' }

export default function AnalysisHistory({ onReload }) {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [stats,   setStats]     = useState(null)
  const [open,    setOpen]      = useState(false)

  useEffect(() => {
    if (open) loadData()
  }, [open])

  async function loadData() {
    setLoading(true)
    try {
      const [hist, st] = await Promise.all([
        apiFetch('/api/db/analysis?limit=20'),
        apiFetch('/api/db/stats'),
      ])
      setRecords(hist.results || [])
      setStats(st)
    } catch {}
    finally { setLoading(false) }
  }

  function formatDate(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('en-IN', {
      day:'2-digit', month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit', hour12:false,
    })
  }

  return (
    <div className="card" style={{ overflow:'hidden', marginTop:16 }}>

      {/* Header — clickable to toggle */}
      <div
        onClick={() => setOpen(o => { if (!o) loadData(); return !o })}
        style={{ background:'#003087', padding:'11px 18px', cursor:'pointer',
                 display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          <span style={{ color:'white', fontWeight:700, fontSize:12,
                         textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Analysis History — Database
          </span>
          {stats && (
            <span style={{ background:'#C8A84B', color:'#003087', fontSize:10,
                            fontWeight:800, padding:'2px 8px', borderRadius:3 }}>
              {stats.analysis_results} records saved
            </span>
          )}
        </div>
        <span style={{ color:'rgba(255,255,255,0.7)', fontSize:16 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Expandable content */}
      {open && (
        <div>
          {/* DB stats strip */}
          {stats && (
            <div style={{ background:'#f5f7fc', borderBottom:'1px solid #dde3f4',
                          padding:'8px 18px', display:'flex', flexWrap:'wrap', gap:'8px 28px' }}>
              {[
                { l:'Analysis Results',   v: stats.analysis_results   },
                { l:'Cargo Datasets',     v: stats.cargo_datasets      },
                { l:'Voyage Disruptions', v: stats.voyage_disruptions  },
                { l:'BDI Snapshots',      v: stats.bdi_snapshots       },
                { l:'Port Congestion',    v: stats.port_congestion     },
                { l:'DB Size',            v: `${stats.db_size_kb} KB`  },
              ].map(s => (
                <div key={s.l}>
                  <span style={{ fontSize:10, color:'#6b7a9e' }}>{s.l}: </span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#003087' }}>{s.v}</span>
                </div>
              ))}
              <button onClick={loadData}
                style={{ marginLeft:'auto', background:'#003087', color:'white',
                         border:'none', borderRadius:4, padding:'3px 12px',
                         fontSize:11, fontWeight:600, cursor:'pointer' }}>
                Refresh
              </button>
            </div>
          )}

          {loading && (
            <div style={{ padding:'24px', textAlign:'center' }}>
              <div style={{ width:28, height:28, border:'3px solid #dde3f4',
                            borderTopColor:'#003087', borderRadius:'50%',
                            animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
              <div style={{ fontSize:12, color:'#6b7a9e' }}>Loading from database…</div>
            </div>
          )}

          {!loading && records.length === 0 && (
            <div style={{ padding:'24px', textAlign:'center', color:'#6b7a9e', fontSize:13 }}>
              No analysis records yet. Run an analysis to save it here.
            </div>
          )}

          {!loading && records.length > 0 && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr>
                    {['#','Commodity','Qty MT','Origin → Port','Period','Rate','Forecast',
                      'Signal','Vessel','Saving (INR)','Risk','Saved At'].map(h => (
                      <th key={h} style={{ background:'#003087', color:'white',
                                            padding:'8px 10px', textAlign:'left',
                                            fontSize:10, fontWeight:700,
                                            textTransform:'uppercase', letterSpacing:'0.05em',
                                            whiteSpace:'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const sig = r.market_signal || '—'
                    return (
                      <tr key={r.id}
                          style={{ borderBottom:'1px solid #eef1fa',
                                   background: i % 2 === 0 ? 'white' : '#fafbff' }}>
                        <td style={{ padding:'8px 10px', fontWeight:700, color:'#003087' }}>
                          {r.id}
                        </td>
                        <td style={{ padding:'8px 10px', fontWeight:600, color:'#1a2340',
                                      whiteSpace:'nowrap' }}>
                          {COMM_LABEL[r.commodity] || r.commodity}
                        </td>
                        <td style={{ padding:'8px 10px', color:'#1a2340' }}>
                          {r.quantity_mt ? Number(r.quantity_mt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>
                          <span style={{ color:'#003087', fontWeight:600 }}>
                            {ORIG_LABEL[r.origin_id] || r.origin_id}
                          </span>
                          <span style={{ color:'#6b7a9e' }}> → </span>
                          <span style={{ color:'#003087', fontWeight:600 }}>
                            {PORT_LABEL[r.port_id] || r.port_id}
                          </span>
                        </td>
                        <td style={{ padding:'8px 10px', color:'#6b7a9e', whiteSpace:'nowrap' }}>
                          {r.target_month ? `${MONTH_NAMES[r.target_month]} ${r.target_year}` : '—'}
                        </td>
                        <td style={{ padding:'8px 10px', fontWeight:600, color:'#003087' }}>
                          {r.current_spot_rate ? `$${Number(r.current_spot_rate).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding:'8px 10px', color:'#1b5e20', fontWeight:600 }}>
                          {r.forecast_rate ? `$${Number(r.forecast_rate).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding:'8px 10px' }}>
                          <span style={{
                            background: SIGNAL_BG[sig]  || '#f5f7fc',
                            color:      SIGNAL_COLOR[sig] || '#6b7a9e',
                            padding:'2px 7px', borderRadius:4,
                            fontSize:10, fontWeight:700, whiteSpace:'nowrap',
                          }}>
                            {sig}
                          </span>
                        </td>
                        <td style={{ padding:'8px 10px', whiteSpace:'nowrap', color:'#1a2340' }}>
                          {r.vessel_type || '—'}
                          {r.vessel_cii_grade ? ` (${r.vessel_cii_grade})` : ''}
                        </td>
                        <td style={{ padding:'8px 10px', fontWeight:700, color:'#1b5e20',
                                      whiteSpace:'nowrap' }}>
                          {r.total_saving_inr
                            ? `Rs.${(r.total_saving_inr/1e5).toFixed(1)}L`
                            : '—'}
                        </td>
                        <td style={{ padding:'8px 10px' }}>
                          <span style={{
                            color: RISK_COLOR[r.risk_level] || '#6b7a9e',
                            fontWeight:700, fontSize:11,
                          }}>
                            {r.risk_level || '—'}
                          </span>
                        </td>
                        <td style={{ padding:'8px 10px', color:'#6b7a9e', fontSize:11,
                                      whiteSpace:'nowrap' }}>
                          {formatDate(r.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
