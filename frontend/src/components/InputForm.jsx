import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'

// ── Form option data ──────────────────────────────────────────────────────────
const COMMODITIES = [
  { id:'thermal_coal', label:'Thermal Coal' },
  { id:'coking_coal',  label:'Coking Coal'  },
  { id:'iron_ore',     label:'Iron Ore'     },
  { id:'limestone',    label:'Limestone'    },
  { id:'bauxite',      label:'Bauxite'      },
]
const ORIGINS = [
  { id:'AU', label:'Australia',     sub:'Newcastle · Hay Point' },
  { id:'ID', label:'Indonesia',     sub:'Samarinda · Taboneo'   },
  { id:'US', label:'United States', sub:'Norfolk'               },
  { id:'MZ', label:'Mozambique',    sub:'Maputo · Nacala'       },
  { id:'RU', label:'Russia',        sub:'Taman · Ust-Luga'      },
]
const PORTS = [
  { id:'INPRD', label:'Paradip',       state:'Odisha',         draft:17.0 },
  { id:'INVTZ', label:'Visakhapatnam', state:'Andhra Pradesh', draft:14.5 },
  { id:'INGVP', label:'Gangavaram',    state:'Andhra Pradesh', draft:18.0 },
  { id:'INGPL', label:'Gopalpur',      state:'Odisha',         draft:12.5 },
  { id:'INDMA', label:'Dhamra',        state:'Odisha',         draft:16.5 },
  { id:'INHAL', label:'Haldia',        state:'West Bengal',    draft:8.5  },
  { id:'INCHP', label:'Chennai',       state:'Tamil Nadu',     draft:14.0 },
]
const MONTHS = [
  {v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},
  {v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},
  {v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'},
]

// ── Value alias maps ──────────────────────────────────────────────────────────
const COMMODITY_ALIASES = {
  'coal':'thermal_coal','thermal coal':'thermal_coal','thermal_coal':'thermal_coal',
  'coking coal':'coking_coal','coking_coal':'coking_coal',
  'iron ore':'iron_ore','iron_ore':'iron_ore','iron':'iron_ore',
  'limestone':'limestone','bauxite':'bauxite',
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
  'chennai':'INCHP','inchp':'INCHP',
}
const MONTH_MAP = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
}

// ── Delivery period parser ("November 2026" → {month:11, year:2026}) ──────────
function parsePeriod(val) {
  if (!val) return {}
  const s = String(val).trim()
  // "November 2026" or "Nov 2026"
  const m1 = s.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (m1) {
    const mn = MONTH_MAP[m1[1].toLowerCase()]
    if (mn) return { target_month:mn, target_year:Number(m1[2]) }
  }
  // "11/2026" or "2026-11"
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{4})$/)
  if (m2) return { target_month:Number(m2[1]), target_year:Number(m2[2]) }
  // plain number = month
  if (/^\d+$/.test(s) && Number(s) <= 12) return { target_month:Number(s) }
  return {}
}

// ── Row → form field mapper ───────────────────────────────────────────────────
// Accepts an object where keys are already lowercase column names
function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim()
    }
    return undefined
  }

  const out = {}

  // Commodity
  const comm = get('commodity','commodity type','commodity_type','cargo type','cargo_type')
  if (comm) out.commodity = COMMODITY_ALIASES[comm.toLowerCase()] || comm.toLowerCase().replace(/\s+/g,'_')

  // Quantity
  const qty = get('quantity (metric tonnes)','quantity_mt','quantity','qty','metric tonnes')
  if (qty) out.quantity_mt = Number(String(qty).replace(/,/g,''))

  // Origin
  const orig = get('origin country','origin_country','origin_id','origin')
  if (orig) out.origin_id = ORIGIN_ALIASES[orig.toLowerCase()] || orig.toUpperCase()

  // Destination port
  const dest = get('destination port','destination_port','port_id','port','destination')
  if (dest) out.port_id = PORT_ALIASES[dest.toLowerCase()] || dest.toUpperCase()

  // Delivery period — may be "November 2026" in one cell OR month+year in two cells
  const period = get('required delivery period','required delivery month','delivery_period')
  if (period) {
    const p = parsePeriod(period)
    if (p.target_month) { out.target_month = p.target_month; out.target_year = p.target_year || 2026 }
  }
  // Separate month/year columns
  const mon = get('month','target_month','delivery_month')
  if (mon && !out.target_month) {
    const p = parsePeriod(mon)
    if (p.target_month) out.target_month = p.target_month
    else if (/^\d+$/.test(mon)) out.target_month = Number(mon)
  }
  const yr = get('year','target_year','delivery_year')
  if (yr && !out.target_year) out.target_year = Number(yr)

  // Contract duration — strip non-numeric (e.g. "6 Months" → 6)
  const cont = get('contract duration (months)','contract duration','contract_months','contract_duration','contract')
  if (cont) out.contract_months = Number(String(cont).replace(/[^0-9]/g,''))

  return out
}

// ── Styled helpers ────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function InputForm({ form, onChange, onSubmit, loading }) {
  const set         = (k, v) => onChange(p => ({ ...p, [k]: v }))
  const fileRef     = useRef(null)
  const formRef     = useRef(form)
  const onSubmitRef = useRef(onSubmit)
  const [fileMsg,  setFileMsg]  = useState(null)
  const [fileErr,  setFileErr]  = useState(null)
  const [fileName, setFileName] = useState(null)

  useEffect(() => { formRef.current     = form     }, [form])
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])

  // ── File upload handler ─────────────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileMsg(null); setFileErr(null); setFileName(file.name)

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv','xlsx','xls'].includes(ext)) {
      setFileErr('This is not a valid dataset. Please upload a .csv or .xlsx file.')
      e.target.value = ''; return
    }

    const reader = new FileReader()

    reader.onload = ev => {
      try {
        // XLSX.read handles both binary .xlsx AND plain text .csv
        const workbook  = XLSX.read(ev.target.result, { type:'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet     = workbook.Sheets[sheetName]

        // sheet_to_json with header:1 gives array of arrays (preserves row order)
        // Use defval:'' so empty cells don't disappear
        const raw = XLSX.utils.sheet_to_json(sheet, { header:1, defval:'' })

        if (!raw || raw.length < 2) {
          setFileErr('This is not a valid dataset. File has no data rows.')
          return
        }

        // Find header row — scan first 6 rows
        const KNOWN = ['commodity','quantity','origin','destination','port','delivery','contract','draft']
        let hdrIdx = 0
        for (let i = 0; i < Math.min(raw.length - 1, 6); i++) {
          const row  = raw[i]
          const hits = row.filter(c => KNOWN.some(k => String(c).toLowerCase().includes(k)))
          if (hits.length >= 2) { hdrIdx = i; break }
        }

        const headers = raw[hdrIdx].map(c => String(c).trim().toLowerCase())

        // Find first non-empty data row after header
        let dataIdx = hdrIdx + 1
        while (dataIdx < raw.length) {
          if (raw[dataIdx].some(c => c !== '')) break
          dataIdx++
        }
        if (dataIdx >= raw.length) {
          setFileErr('This is not a valid dataset. No data row found after header.')
          return
        }

        const values = raw[dataIdx].map(c => String(c).trim())

        // Build normalised row object  { lowercase_col_name: value }
        const rowObj = {}
        headers.forEach((h, i) => { rowObj[h] = values[i] || '' })

        const parsed = mapRow(rowObj)

        if (Object.keys(parsed).length < 3) {
          setFileErr(
            'This is not a valid dataset. Could not read required columns.\n' +
            'Expected: Commodity Type, Quantity (Metric Tonnes), Origin Country, ' +
            'Destination Port, Required Delivery Period, Contract Duration.'
          )
          return
        }

        // Update form + show success
        onChange(prev => ({ ...prev, ...parsed }))

        const parts = [
          parsed.commodity?.replace(/_/g,' '),
          parsed.quantity_mt ? `${Number(parsed.quantity_mt).toLocaleString()} MT` : null,
          parsed.origin_id,
          parsed.port_id,
        ].filter(Boolean)
        setFileMsg(`Loaded: ${parts.join(' · ')} — Running analysis…`)

        // Auto-submit with merged data after React state update
        const merged = { ...formRef.current, ...parsed }
        setTimeout(() => onSubmitRef.current?.(merged), 150)

      } catch (err) {
        setFileErr('Failed to read file: ' + err.message)
      }
    }

    reader.onerror = () => setFileErr('Could not read the file. Please try again.')
    // readAsArrayBuffer works for ALL file types — binary xlsx AND plain csv
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}
          className="card" style={{ overflow:'hidden' }}>

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

        {/* ── Upload section ── */}
        <div style={{ background:'white', border:'2px dashed #c4cde3', borderRadius:8, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#003087',
                        textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
            Import from File
          </div>

          {/* Drop zone / button */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{ cursor:'pointer', background:'#f5f7fc', border:'1px solid #dde3f4',
                     borderRadius:6, padding:'14px 12px', textAlign:'center',
                     transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#eef1fb'}
            onMouseLeave={e => e.currentTarget.style.background='#f5f7fc'}
          >
            <div style={{ fontSize:22, marginBottom:6 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                   stroke="#003087" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 12 15 15"/>
              </svg>
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:'#003087' }}>
              {fileName ? fileName : 'Click to upload Excel or CSV'}
            </div>
            <div style={{ fontSize:11, color:'#6b7a9e', marginTop:3 }}>
              .xlsx, .xls or .csv · Auto-runs analysis on upload
            </div>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                 style={{ display:'none' }} onChange={handleFile} />

          {/* Success */}
          {fileMsg && (
            <div style={{ marginTop:10, fontSize:12, color:'#1b5e20', background:'#e8f5e9',
                          border:'1px solid #a5d6a7', borderRadius:6,
                          padding:'8px 12px', lineHeight:1.5 }}>
              {fileMsg}
            </div>
          )}

          {/* Error */}
          {fileErr && (
            <div style={{ marginTop:10, fontSize:12, color:'#b71c1c', background:'#ffebee',
                          border:'1px solid #ef9a9a', borderRadius:6,
                          padding:'8px 12px', lineHeight:1.5, whiteSpace:'pre-line' }}>
              {fileErr}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:1, background:'#dde3f4' }} />
          <span style={{ fontSize:10, fontWeight:700, color:'#6b7a9e', letterSpacing:'0.06em' }}>
            OR ENTER MANUALLY
          </span>
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
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>
            {form.quantity_mt.toLocaleString()} MT
          </div>
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
              <option key={p.id} value={p.id}>
                {p.label} — {p.state} (Max Draft {p.draft}m)
              </option>
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
                     padding:'11px 0', border:'none',
                     cursor: loading ? 'not-allowed' : 'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? (
              <>
                <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
                                borderTopColor:'white', borderRadius:'50%',
                                animation:'spin 0.7s linear infinite',
                                display:'inline-block' }} />
                Analysing…
              </>
            ) : 'Run Analysis'}
          </button>
        </div>
      </div>
    </form>
  )
}
