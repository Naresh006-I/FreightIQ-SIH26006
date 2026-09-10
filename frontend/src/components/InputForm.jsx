import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'

// ── Form option data ──────────────────────────────────────────────────────────
const COMMODITIES = [
  { id:'thermal_coal',  label:'Thermal Coal'  },
  { id:'coking_coal',   label:'Coking Coal'   },
  { id:'iron_ore',      label:'Iron Ore'      },
  { id:'limestone',     label:'Limestone'     },
  { id:'bauxite',       label:'Bauxite'       },
  { id:'manganese_ore', label:'Manganese Ore' },
]
const ORIGINS = [
  { id:'AU', label:'Australia',    sub:'Newcastle · Hay Point' },
  { id:'ID', label:'Indonesia',    sub:'Samarinda · Taboneo'  },
  { id:'US', label:'United States',sub:'Norfolk'              },
  { id:'MZ', label:'Mozambique',   sub:'Maputo · Nacala'      },
  { id:'RU', label:'Russia',       sub:'Taman · Ust-Luga'     },
  { id:'BR', label:'Brazil',       sub:'Tubarao · Itaguai'    },
  { id:'ZA', label:'South Africa', sub:'Richards Bay · Saldanha' },
  { id:'GA', label:'Gabon',        sub:'Owendo · Port-Gentil' },
]
const PORTS = [
  { id:'INPRD', label:'Paradip',       state:'Odisha',         draft:17.0 },
  { id:'INVTZ', label:'Visakhapatnam', state:'Andhra Pradesh', draft:14.5 },
  { id:'INGVP', label:'Gangavaram',    state:'Andhra Pradesh', draft:18.0 },
  { id:'INGPL', label:'Gopalpur',      state:'Odisha',         draft:12.5 },
  { id:'INDMA', label:'Dhamra',        state:'Odisha',         draft:16.5 },
  { id:'INHAL', label:'Haldia',        state:'West Bengal',    draft:8.5  },
  { id:'INCHP', label:'Chennai',       state:'Tamil Nadu',     draft:14.0 },
  { id:'INKDL', label:'Kandla',        state:'Gujarat',        draft:14.5 },
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
  'manganese ore':'manganese_ore','manganese_ore':'manganese_ore','manganese':'manganese_ore',
}
const ORIGIN_ALIASES = {
  'australia':'AU','au':'AU',
  'indonesia':'ID','id':'ID',
  'united states':'US','usa':'US','us':'US',
  'mozambique':'MZ','mz':'MZ',
  'russia':'RU','ru':'RU',
  'brazil':'BR','br':'BR',
  'south africa':'ZA','za':'ZA',
  'gabon':'GA','ga':'GA',
}
const PORT_ALIASES = {
  'paradip':'INPRD','inprd':'INPRD',
  'visakhapatnam':'INVTZ','vizag':'INVTZ','invtz':'INVTZ',
  'gangavaram':'INGVP','ingvp':'INGVP',
  'gopalpur':'INGPL','ingpl':'INGPL',
  'dhamra':'INDMA','indma':'INDMA',
  'haldia':'INHAL','inhal':'INHAL',
  'chennai':'INCHP','inchp':'INCHP',
  'kandla':'INKDL','inkdl':'INKDL',
}
const MONTH_MAP = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
}

function parsePeriod(val) {
  if (!val) return {}
  const s = String(val).trim()
  const m1 = s.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (m1) { const mn=MONTH_MAP[m1[1].toLowerCase()]; if(mn) return {target_month:mn,target_year:Number(m1[2])} }
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{4})$/)
  if (m2) return {target_month:Number(m2[1]),target_year:Number(m2[2])}
  if (/^\d+$/.test(s) && Number(s)<=12) return {target_month:Number(s)}
  return {}
}

// ── Map a normalised row object → form fields ─────────────────────────────────
function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && String(row[k]).trim() !== '') return String(row[k]).trim()
    }
    return undefined
  }
  const out = {}

  const comm = get('commodity type','commodity','commodity_type','cargo type','cargo_type')
  if (comm) out.commodity = COMMODITY_ALIASES[comm.toLowerCase()] || comm.toLowerCase().replace(/\s+/g,'_')

  const qty = get('quantity (metric tonnes)','quantity_mt','quantity','qty')
  if (qty) out.quantity_mt = Number(String(qty).replace(/,/g,''))

  const orig = get('origin country','origin_country','origin_id','origin')
  if (orig) out.origin_id = ORIGIN_ALIASES[orig.toLowerCase()] || orig.toUpperCase()

  const dest = get('destination port','destination_port','port_id','port','destination')
  if (dest) out.port_id = PORT_ALIASES[dest.toLowerCase()] || dest.toUpperCase()

  const period = get('required delivery period','required delivery month','delivery_period')
  if (period) {
    const p = parsePeriod(period)
    if (p.target_month) { out.target_month = p.target_month; out.target_year = p.target_year || 2026 }
  }
  const mon = get('month','target_month')
  if (mon && !out.target_month) {
    const p = parsePeriod(mon)
    if (p.target_month) out.target_month = p.target_month
    else if (/^\d+$/.test(mon)) out.target_month = Number(mon)
  }
  const yr = get('year','target_year')
  if (yr && !out.target_year) out.target_year = Number(yr)

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

// ── Row Selector Component ────────────────────────────────────────────────────
function RowSelector({ rows, onSelect }) {
  const [inputId,      setInputId]      = useState('')
  const [err,          setErr]          = useState('')
  const [activeId,     setActiveId]     = useState(null)   // highlights selected row

  const COMM_LABELS = {
    thermal_coal:'Thermal Coal', coking_coal:'Coking Coal', iron_ore:'Iron Ore',
    limestone:'Limestone', bauxite:'Bauxite', manganese_ore:'Manganese Ore',
  }
  const ORIG_LABELS = {
    AU:'Australia', ID:'Indonesia', US:'USA', MZ:'Mozambique',
    RU:'Russia', BR:'Brazil', ZA:'South Africa', GA:'Gabon',
  }
  const PORT_LABELS = {
    INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram', INGPL:'Gopalpur',
    INDMA:'Dhamra', INHAL:'Haldia', INCHP:'Chennai', INKDL:'Kandla',
  }

  function selectById(idStr) {
    const id  = Number(String(idStr).trim())
    if (!id || isNaN(id)) { setErr('Please enter a valid number'); return }
    const row = rows.find(r => r.__id === id)
    if (!row) {
      setErr(`ID ${id} not found. Available IDs: ${rows.map(r => r.__id).join(', ')}`)
      return
    }
    setErr('')
    setActiveId(id)
    onSelect(row)
  }

  // Prevent ID-input Enter from bubbling to outer form submit
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      selectById(inputId)
    }
  }

  function handleLoadClick(e) {
    e.preventDefault()
    e.stopPropagation()
    selectById(inputId)
  }

  return (
    <div style={{ background:'white', border:'2px solid #003087', borderRadius:8, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ background:'#003087', padding:'10px 14px',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ color:'white', fontWeight:700, fontSize:12,
                      textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {rows.length} Rows Loaded — Enter ID to Analyse
        </div>
        <span style={{ background:'#C8A84B', color:'#003087', fontSize:10,
                        fontWeight:800, padding:'2px 8px', borderRadius:3 }}>
          IDs: {rows.map(r => r.__id).join(', ')}
        </span>
      </div>

      {/* ID input — stopPropagation ensures it doesn't trigger outer form */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid #eef1fa',
                    background:'#eff6ff' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#003087', marginBottom:8 }}>
          Type an ID number and press Load — or click a row below
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input
            type="number"
            min={1}
            placeholder={`Enter ID (${rows.map(r=>r.__id).join(', ')})`}
            value={inputId}
            onChange={e => { setInputId(e.target.value); setErr('') }}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            style={{ flex:1, border:'2px solid #003087', borderRadius:6,
                     padding:'9px 14px', fontSize:16, fontWeight:800,
                     color:'#003087', outline:'none', textAlign:'center',
                     background:'white' }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleLoadClick}
            style={{ background:'#003087', color:'white', border:'none',
                     borderRadius:6, padding:'9px 20px', fontSize:13,
                     fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                     letterSpacing:'0.03em' }}>
            Load &amp; Run
          </button>
        </div>
        {err && (
          <div style={{ marginTop:6, fontSize:11, color:'#b71c1c',
                        background:'#ffebee', padding:'4px 8px',
                        borderRadius:4, border:'1px solid #ef9a9a' }}>
            {err}
          </div>
        )}
      </div>

      {/* Row cards */}
      <div style={{ maxHeight:240, overflowY:'auto', padding:'8px 10px',
                    display:'flex', flexDirection:'column', gap:6 }}>
        {rows.map(row => {
          const isActive = row.__id === activeId
          return (
            <div
              key={row.__id}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveId(row.__id); onSelect(row) }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                       background: isActive ? '#e3f2fd' : '#f5f7fc',
                       border: isActive ? '2px solid #003087' : '1px solid #dde3f4',
                       borderRadius:7, cursor:'pointer', transition:'all 0.12s' }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='#eef1fb'; e.currentTarget.style.borderColor='#90caf9' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='#f5f7fc'; e.currentTarget.style.borderColor='#dde3f4' } }}
            >
              {/* ID badge */}
              <div style={{ width:34, height:34, borderRadius:7,
                            background: isActive ? '#003087' : '#e8ecf4',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color: isActive ? 'white' : '#003087',
                            fontWeight:900, fontSize:14, flexShrink:0,
                            border: isActive ? '2px solid #C8A84B' : '1px solid #c4cde3' }}>
                {row.__id}
              </div>

              {/* Row summary */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:12, color:'#003087' }}>
                  {COMM_LABELS[row.commodity] || row.commodity}
                  {row.quantity_mt && ` · ${Number(row.quantity_mt).toLocaleString()} MT`}
                </div>
                <div style={{ fontSize:11, color:'#6b7a9e', marginTop:2 }}>
                  {ORIG_LABELS[row.origin_id] || row.origin_id}
                  {' → '}
                  {PORT_LABELS[row.port_id] || row.port_id}
                  {row.target_month
                    ? ` · ${MONTHS.find(m => m.v === row.target_month)?.l || ''} ${row.target_year || ''}`
                    : ''}
                  {row.contract_months ? ` · ${row.contract_months}mo contract` : ''}
                </div>
              </div>

              {/* Status */}
              <div style={{ fontSize:10, fontWeight:700, flexShrink:0,
                            color: isActive ? '#1b5e20' : '#003087' }}>
                {isActive ? 'Running...' : 'Click'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InputForm({ form, onChange, onSubmit, loading }) {
  const set         = (k, v) => onChange(p => ({ ...p, [k]: v }))
  const fileRef     = useRef(null)
  const formRef     = useRef(form)
  const onSubmitRef = useRef(onSubmit)

  const [fileMsg,   setFileMsg]   = useState(null)
  const [fileErr,   setFileErr]   = useState(null)
  const [fileName,  setFileName]  = useState(null)
  const [allRows,   setAllRows]   = useState(null)   // all rows from multi-row Excel

  useEffect(() => { formRef.current     = form     }, [form])
  useEffect(() => { onSubmitRef.current = onSubmit }, [onSubmit])

  // ── Load a specific row into form + auto-run analysis ─────────────────────
  // Key fix: build merged form BEFORE calling onChange, pass it directly to onSubmit
  // Do NOT rely on formRef.current which is stale during the same render cycle
  function loadRow(row) {
    const { __id, ...fields } = row

    // Merge with current form defaults for any missing fields
    const defaults = {
      commodity: 'thermal_coal', quantity_mt: 80000,
      origin_id: 'AU', port_id: 'INPRD',
      target_month: 11, target_year: 2026, contract_months: 6,
    }
    const merged = { ...defaults, ...formRef.current, ...fields }

    // Update the form display
    onChange(() => ({ ...merged }))

    // Show status
    setFileMsg(`Running analysis for ID ${__id} — ${fields.commodity?.replace(/_/g,' ')} from ${fields.origin_id || '?'} to ${fields.port_id || '?'}`)

    // Submit with the already-computed merged object (not relying on state update)
    setTimeout(() => onSubmitRef.current?.(merged), 200)
  }

  // ── Excel / CSV upload ────────────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileMsg(null); setFileErr(null); setAllRows(null); setFileName(file.name)

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv','xlsx','xls'].includes(ext)) {
      setFileErr('This is not a valid dataset. Please upload a .csv or .xlsx file.')
      e.target.value = ''; return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const workbook  = XLSX.read(ev.target.result, { type:'array' })
        const sheet     = workbook.Sheets[workbook.SheetNames[0]]
        const raw       = XLSX.utils.sheet_to_json(sheet, { header:1, defval:'' })

        if (!raw || raw.length < 2) {
          setFileErr('This is not a valid dataset. File has no data rows.')
          return
        }

        // Find header row
        const KNOWN = ['commodity','quantity','origin','destination','port','delivery','contract','id']
        let hdrIdx = 0
        for (let i = 0; i < Math.min(raw.length - 1, 6); i++) {
          const hits = raw[i].filter(c => KNOWN.some(k => String(c).toLowerCase().includes(k)))
          if (hits.length >= 2) { hdrIdx = i; break }
        }
        const headers = raw[hdrIdx].map(c => String(c).trim().toLowerCase())

        // Parse ALL data rows after header
        const parsedRows = []
        for (let i = hdrIdx + 1; i < raw.length; i++) {
          const vals = raw[i]
          if (vals.every(v => v === '' || v === null)) continue  // skip blank rows

          const rowObj = {}
          headers.forEach((h, idx) => { rowObj[h] = String(vals[idx] || '').trim() })

          const mapped = mapRow(rowObj)
          if (Object.keys(mapped).length < 3) continue  // skip rows with too few fields

          // Extract the ID column (first numeric column or 'id' column)
          const idVal = rowObj['id'] || rowObj[''] || String(i - hdrIdx)
          mapped.__id = Number(idVal) || (parsedRows.length + 1)

          parsedRows.push(mapped)
        }

        if (parsedRows.length === 0) {
          setFileErr('This is not a valid dataset. No valid data rows found.')
          return
        }

        if (parsedRows.length === 1) {
          // Single row — load and run immediately
          setFileMsg(`Loaded: 1 row from ${file.name}. Running analysis…`)
          loadRow(parsedRows[0])
        } else {
          // Multiple rows — show row selector
          setAllRows(parsedRows)
          setFileMsg(null)
        }

      } catch (err) {
        setFileErr('Failed to read file: ' + err.message)
      }
    }
    reader.onerror = () => setFileErr('Could not read the file. Please try again.')
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}
          className="card" style={{ overflow:'hidden' }}>

      {/* Header */}
      <div style={{ background:'#003087', padding:'16px 20px' }}>
        <div style={{ color:'white', fontWeight:700, fontSize:15, letterSpacing:'0.04em' }}>
          SHIPMENT ANALYSIS
        </div>
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:3 }}>
          Upload Excel / CSV or enter cargo details manually
        </div>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16, background:'#f8f9fd' }}>

        {/* ── Upload zone ── */}
        <div style={{ background:'white', border:'2px dashed #c4cde3', borderRadius:8, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#003087',
                        textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
            Import from File
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            style={{ cursor:'pointer', background:'#f5f7fc', border:'1px solid #dde3f4',
                     borderRadius:6, padding:'14px 12px', textAlign:'center' }}
            onMouseEnter={e => e.currentTarget.style.background='#eef1fb'}
            onMouseLeave={e => e.currentTarget.style.background='#f5f7fc'}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#003087"
                 strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                 style={{ margin:'0 auto 6px', display:'block' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 12 15 15"/>
            </svg>
            <div style={{ fontSize:13, fontWeight:600, color:'#003087' }}>
              {fileName ? fileName : 'Click to upload Excel or CSV'}
            </div>
            <div style={{ fontSize:11, color:'#6b7a9e', marginTop:3 }}>
              .xlsx, .xls, or .csv &nbsp;&middot;&nbsp; Single or multi-row supported
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                 style={{ display:'none' }} onChange={handleFile} />

          {/* Success message */}
          {fileMsg && (
            <div style={{ marginTop:10, fontSize:12, color:'#1b5e20', background:'#e8f5e9',
                          border:'1px solid #a5d6a7', borderRadius:6, padding:'8px 12px' }}>
              {fileMsg}
            </div>
          )}
          {/* Error message */}
          {fileErr && (
            <div style={{ marginTop:10, fontSize:12, color:'#b71c1c', background:'#ffebee',
                          border:'1px solid #ef9a9a', borderRadius:6, padding:'8px 12px',
                          whiteSpace:'pre-line' }}>
              {fileErr}
            </div>
          )}
        </div>

        {/* ── Row Selector (stays visible so user can select another ID) ── */}
        {allRows && (
          <RowSelector
            rows={allRows}
            onSelect={row => loadRow(row)}
          />
        )}

        {/* ── Divider ── */}
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
            style={{ width:'100%', border:'1px solid #c4cde3', borderRadius:5,
                     padding:'7px 10px', fontSize:13, color:'#1a2340',
                     background:'white', outline:'none' }} />
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
                                animation:'spin 0.7s linear infinite', display:'inline-block' }} />
                Analysing…
              </>
            ) : 'Run Analysis'}
          </button>
        </div>
      </div>
    </form>
  )
}
