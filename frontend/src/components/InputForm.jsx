const COMMODITIES = [
  { id:'thermal_coal', label:'Thermal Coal'  },
  { id:'coking_coal',  label:'Coking Coal'   },
  { id:'iron_ore',     label:'Iron Ore'       },
  { id:'limestone',    label:'Limestone'      },
  { id:'bauxite',      label:'Bauxite'        },
]
const ORIGINS = [
  { id:'AU', label:'Australia',    sub:'Newcastle · Hay Point' },
  { id:'ID', label:'Indonesia',    sub:'Samarinda · Taboneo'  },
  { id:'US', label:'United States',sub:'Norfolk'              },
  { id:'MZ', label:'Mozambique',   sub:'Maputo · Nacala'      },
  { id:'RU', label:'Russia',       sub:'Taman · Ust-Luga'     },
]
const PORTS = [
  { id:'INPRD', label:'Paradip',        state:'Odisha',         draft:17.0 },
  { id:'INVTZ', label:'Visakhapatnam',  state:'Andhra Pradesh', draft:14.5 },
  { id:'INGVP', label:'Gangavaram',     state:'Andhra Pradesh', draft:18.0 },
  { id:'INGPL', label:'Gopalpur',       state:'Odisha',         draft:12.5 },
  { id:'INDMA', label:'Dhamra',         state:'Odisha',         draft:16.5 },
  { id:'INHAL', label:'Haldia',         state:'West Bengal',    draft:8.5  },
]
const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]

const L = ({ children }) => (
  <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#003087',
                  textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
    {children}
  </label>
)

const S = ({ value, onChange, children }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'7px 10px',
             fontSize:13, color:'#1a2340', background:'white', outline:'none', cursor:'pointer' }}>
    {children}
  </select>
)

export default function InputForm({ form, onChange, onSubmit, loading }) {
  const set = (k, v) => onChange(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="card" style={{ overflow:'hidden' }}>

      {/* Form header */}
      <div style={{ background:'#003087', padding:'16px 20px' }}>
        <div style={{ color:'white', fontWeight:700, fontSize:15, letterSpacing:'0.04em' }}>
          SHIPMENT ANALYSIS
        </div>
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:3 }}>
          Enter cargo details for AI-powered chartering insights
        </div>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16, background:'#f8f9fd' }}>

        <div>
          <L>Commodity Type</L>
          <S value={form.commodity} onChange={v => set('commodity', v)}>
            {COMMODITIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </S>
        </div>

        <div>
          <L>Quantity (Metric Tonnes)</L>
          <input type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
            onChange={e => set('quantity_mt', Number(e.target.value))}
            style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'7px 10px',
                     fontSize:13, color:'#1a2340', background:'white', outline:'none' }} />
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>
            {form.quantity_mt.toLocaleString()} MT
          </div>
        </div>

        <div>
          <L>Origin Country</L>
          <S value={form.origin_id} onChange={v => set('origin_id', v)}>
            {ORIGINS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </S>
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>
            {ORIGINS.find(o => o.id === form.origin_id)?.sub}
          </div>
        </div>

        <div>
          <L>Destination Port</L>
          <S value={form.port_id} onChange={v => set('port_id', v)}>
            {PORTS.map(p => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.state} (Max Draft {p.draft}m)
              </option>
            ))}
          </S>
        </div>

        <div>
          <L>Required Delivery Period</L>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <S value={form.target_month} onChange={v => set('target_month', Number(v))}>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </S>
            <S value={form.target_year} onChange={v => set('target_year', Number(v))}>
              {[2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
            </S>
          </div>
        </div>

        <div>
          <L>Contract Duration</L>
          <S value={form.contract_months} onChange={v => set('contract_months', Number(v))}>
            {[1,3,6,9,12,18,24].map(m => (
              <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
            ))}
          </S>
        </div>

        <div style={{ borderTop:'1px solid #dde3f4', paddingTop:16 }}>
          <button type="submit" disabled={loading}
            style={{ width:'100%', background: loading ? '#9aafd4' : '#003087',
                     color:'white', fontWeight:700, fontSize:14, borderRadius:5,
                     padding:'11px 0', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                     transition:'background 0.15s' }}>
            {loading
              ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
                                  borderTopColor:'white', borderRadius:'50%',
                                  animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Analysing…</>
              : <><span style={{ color:'#C8A84B', fontSize:16 }}>▶</span> Run Freight Analysis</>
            }
          </button>
        </div>

        <div style={{ fontSize:11, color:'#aab', textAlign:'center' }}>
          SAIL Internal · AI Decision Support · SIH26006
        </div>
      </div>
    </form>
  )
}
