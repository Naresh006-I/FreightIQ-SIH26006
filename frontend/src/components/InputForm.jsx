import { useRef, useState } from 'react'

const COMMODITIES = [
  { id:'thermal_coal', label:'Thermal Coal'   },
  { id:'coking_coal',  label:'Coking Coal'    },
  { id:'iron_ore',     label:'Iron Ore'        },
  { id:'limestone',    label:'Limestone'       },
  { id:'bauxite',      label:'Bauxite'         },
]
const ORIGINS = [
  { id:'AU', label:'Australia',     sub:'Newcastle · Hay Point' },
  { id:'ID', label:'Indonesia',     sub:'Samarinda · Taboneo'   },
  { id:'US', label:'United States', sub:'Norfolk'               },
  { id:'MZ', label:'Mozambique',    sub:'Maputo · Nacala'       },
  { id:'RU', label:'Russia',        sub:'Taman · Ust-Luga'      },
]
const PORTS = [
  { id:'INPRD', label:'Paradip',        state:'Odisha',         draft:17.0 },
  { id:'INVTZ', label:'Visakhapatnam',  state:'Andhra Pradesh', draft:14.5 },
  { id:'INGVP', label:'Gangavaram',     state:'Andhra Pradesh', draft:18.0 },
  { id:'INGPL', label:'Gopalpur',       state:'Odisha',         draft:12.5 },
  { id:'INDMA', label:'Dhamra',         state:'Odisha',         draft:16.5 },
  { id:'INHAL', label:'Haldia',         state:'West Bengal',    draft:8.5  },
  { id:'INCHP', label:'Chennai',        state:'Tamil Nadu',     draft:14.0 },
]
const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]

// Map CSV/Excel column names to form fields
const CSV_FIELD_MAP = {
  commodity:       ['commodity','commodity_type','cargo_type'],
  quantity_mt:     ['quantity_mt','quantity','qty','metric_tonnes','quantity_metric_tonnes'],
  origin_id:       ['origin_id','origin','origin_country'],
  port_id:         ['port_id','destination_port','port','destination'],
  target_month:    ['target_month','month','delivery_month'],
  target_year:     ['target_year','year','delivery_year'],
  contract_months: ['contract_months','contract_duration','contract'],
}

const COMMODITY_ALIASES = {
  'coal':'thermal_coal','thermal coal':'thermal_coal','coking coal':'coking_coal',
  'iron ore':'iron_ore','iron':'iron_ore','limestone':'limestone','bauxite':'bauxite',
}

const ORIGIN_ALIASES = {
  'australia':'AU','au':'AU','indonesia':'ID','id':'ID',
  'united states':'US','usa':'US','us':'US',
  'mozambique':'MZ','mz':'MZ','russia':'RU','ru':'RU',
}

const PORT_ALIASES = {
  'paradip':'INPRD','inprd':'INPRD',
  'visakhapatnam':'INVTZ','vizag':'INVTZ','invtz':'INVTZ',
  'gangavaram':'INGVP','ingvp':'INGVP',
  'gopalpur':'INGPL','ingpl':'INGPL',
  'dhamra':'INDMA','indma':'INDMA',
  'haldia':'INHAL','inhal':'INHAL',
}

function parseCSVRow(headers, values) {
  const row = {}
  headers.forEach((h, i) => { row[h.trim().toLowerCase()] = (values[i] || '').trim() })
  const out = {}
  for (const [field, aliases] of Object.entries(CSV_FIELD_MAP)) {
    for (const alias of aliases) {
      if (row[alias] !== undefined) {
        out[field] = row[alias]
        break
      }
    }
  }
  // Normalise values
  if (out.commodity) out.commodity  = COMMODITY_ALIASES[out.commodity.toLowerCase()] || out.commodity.toLowerCase().replace(' ','_')
  if (out.origin_id) out.origin_id  = ORIGIN_ALIASES[out.origin_id.toLowerCase()] || out.origin_id.toUpperCase()
  if (out.port_id)   out.port_id    = PORT_ALIASES[out.port_id.toLowerCase()] || out.port_id.toUpperCase()
  if (out.quantity_mt)     out.quantity_mt     = Number(out.quantity_mt)
  if (out.target_month)    out.target_month    = Number(out.target_month)
  if (out.target_year)     out.target_year     = Number(out.target_year)
  if (out.contract_months) out.contract_months = Number(out.contract_months)
  return out
}

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
  const set       = (k, v) => onChange(p => ({ ...p, [k]: v }))
  const fileRef   = useRef(null)
  const [fileMsg, setFileMsg] = useState(null)
  const [fileErr, setFileErr] = useState(null)

  // ── CSV / Excel file parser ─────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileMsg(null); setFileErr(null)

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv','xlsx','xls'].includes(ext)) {
      setFileErr('This is not a valid dataset. Please upload a .csv or .xlsx file.')
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        let text = ''
        if (ext === 'csv') {
          text = ev.target.result
        } else {
        setFileErr('Excel files: please save as CSV first, or we handle basic XLSX below.')
          text = ev.target.result
        }

        const lines   = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) {
          setFileErr('This is not a valid dataset. File must have a header row and at least one data row.')
          return
        }
        const headers = lines[0].split(',')
        const values  = lines[1].split(',')
        const parsed  = parseCSVRow(headers, values)

        if (Object.keys(parsed).length === 0) {
          setFileErr('This is not a valid dataset. Could not recognise any column headers.')
          return
        }

        onChange(prev => ({ ...prev, ...parsed }))
        setFileMsg(`Loaded from ${file.name} — ${Object.keys(parsed).length} fields mapped successfully.`)
      } catch (err) {
        setFileErr('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsText(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="card" style={{ overflow:'hidden' }}>

      {/* Header */}
      <div style={{ background:'#003087', padding:'16px 20px' }}>
        <div style={{ color:'white', fontWeight:700, fontSize:15, letterSpacing:'0.04em' }}>SHIPMENT ANALYSIS</div>
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:3 }}>
          Enter cargo details for AI-powered chartering insights
        </div>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16, background:'#f8f9fd' }}>

        {/* ── Upload Section ── */}
        <div style={{ background:'white', border:'1px dashed #c4cde3', borderRadius:6, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#003087', textTransform:'uppercase',
                        letterSpacing:'0.08em', marginBottom:10 }}>
            Import from File
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ background:'#f0f3fb', border:'1px solid #c4cde3', borderRadius:5,
                       padding:'7px 14px', fontSize:12, fontWeight:600, color:'#003087',
                       cursor:'pointer', flexShrink:0 }}>
              Choose File
            </button>
            <span style={{ fontSize:11, color:'#6b7a9e' }}>CSV or Excel (.xlsx)</span>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                   style={{ display:'none' }} onChange={handleFile} />
          </div>
          {fileMsg && (
            <div style={{ marginTop:8, fontSize:11, color:'#1b5e20', background:'#e8f5e9',
                          border:'1px solid #a5d6a7', borderRadius:4, padding:'5px 10px' }}>
              {fileMsg}
            </div>
          )}
          {fileErr && (
            <div style={{ marginTop:8, fontSize:11, color:'#b71c1c', background:'#ffebee',
                          border:'1px solid #ef9a9a', borderRadius:4, padding:'5px 10px' }}>
              {fileErr}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:1, background:'#dde3f4' }} />
          <span style={{ fontSize:10, fontWeight:700, color:'#6b7a9e', letterSpacing:'0.06em' }}>OR ENTER MANUALLY</span>
          <div style={{ flex:1, height:1, background:'#dde3f4' }} />
        </div>

        {/* Commodity */}
        <div>
          <L>Commodity Type</L>
          <S value={form.commodity} onChange={v => set('commodity', v)}>
            {COMMODITIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </S>
        </div>

        {/* Quantity */}
        <div>
          <L>Quantity (Metric Tonnes)</L>
          <input type="number" value={form.quantity_mt} min={10000} max={500000} step={5000}
            onChange={e => set('quantity_mt', Number(e.target.value))}
            style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5, padding:'7px 10px',
                     fontSize:13, color:'#1a2340', background:'white', outline:'none' }} />
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>{form.quantity_mt.toLocaleString()} MT</div>
        </div>

        {/* Origin */}
        <div>
          <L>Origin Country</L>
          <S value={form.origin_id} onChange={v => set('origin_id', v)}>
            {ORIGINS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </S>
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>
            {ORIGINS.find(o => o.id === form.origin_id)?.sub}
          </div>
        </div>

        {/* Destination */}
        <div>
          <L>Destination Port</L>
          <S value={form.port_id} onChange={v => set('port_id', v)}>
            {PORTS.map(p => (
              <option key={p.id} value={p.id}>{p.label} — {p.state} (Max Draft {p.draft}m)</option>
            ))}
          </S>
        </div>

        {/* Delivery Period */}
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

        {/* Contract */}
        <div>
          <L>Contract Duration</L>
          <S value={form.contract_months} onChange={v => set('contract_months', Number(v))}>
            {[1,3,6,9,12,18,24].map(m => (
              <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
            ))}
          </S>
        </div>

        {/* Submit */}
        <div style={{ borderTop:'1px solid #dde3f4', paddingTop:16 }}>
          <button type="submit" disabled={loading}
            style={{ width:'100%', background: loading ? '#9aafd4' : '#003087',
                     color:'white', fontWeight:700, fontSize:14, borderRadius:5,
                     padding:'11px 0', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading
              ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
                                  borderTopColor:'white', borderRadius:'50%',
                                  animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Analysing…</>
              : 'Run Analysis'
            }
          </button>
        </div>
      </div>
    </form>
  )
}
