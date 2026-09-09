/**
 * RouteMap — Multi-Route AI Optimization Map (SIH26006)
 *
 * Features:
 *  - Fetches 3 alternative sea routes from /api/routes
 *  - Draws all routes as colored polylines (navy=R1, orange=R2, green=R3)
 *  - AI recommends best route (composite score: time 35% + cost 35% + safety 30%)
 *  - Route picker panel: user selects route, map highlights it
 *  - Click vessel marker → VesselDashboard sub-page
 *  - Click port marker   → PortDashboard sub-page
 *  - Fullscreen toggle
 *  - OSM tiles — English labels, no API key
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from '../config'

// Fix Vite + Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Port + Origin data ────────────────────────────────────────────────────────
const EC_PORTS = [
  { id:'INPRD', name:'Paradip',       lat:20.317, lon:86.611, state:'Odisha',         maxDraft:17.0, berths:12 },
  { id:'INVTZ', name:'Visakhapatnam', lat:17.686, lon:83.282, state:'Andhra Pradesh', maxDraft:14.5, berths:10 },
  { id:'INGVP', name:'Gangavaram',    lat:17.623, lon:83.226, state:'Andhra Pradesh', maxDraft:18.0, berths:8  },
  { id:'INGPL', name:'Gopalpur',      lat:19.263, lon:84.893, state:'Odisha',         maxDraft:12.5, berths:4  },
  { id:'INDMA', name:'Dhamra',        lat:20.892, lon:86.879, state:'Odisha',         maxDraft:16.5, berths:6  },
  { id:'INHAL', name:'Haldia',        lat:22.026, lon:88.069, state:'West Bengal',    maxDraft:8.5,  berths:9  },
  { id:'INCHP', name:'Chennai',       lat:13.083, lon:80.299, state:'Tamil Nadu',     maxDraft:14.0, berths:11 },
]

const ORIGINS = {
  AU:{ name:'Newcastle, Australia',   lat:-32.92, lon:151.77 },
  ID:{ name:'Samarinda, Indonesia',   lat: -0.50, lon:117.15 },
  US:{ name:'Norfolk, United States', lat: 36.85, lon:-76.29 },
  MZ:{ name:'Maputo, Mozambique',     lat:-25.97, lon: 32.59 },
  RU:{ name:'Taman, Russia',          lat: 45.21, lon: 36.72 },
}

const NEARBY = {
  INPRD:['INGPL','INDMA','INGVP'], INVTZ:['INGVP','INGPL','INPRD'],
  INGVP:['INVTZ','INGPL','INPRD'], INGPL:['INVTZ','INGVP','INDMA'],
  INDMA:['INPRD','INGPL','INHAL'], INHAL:['INDMA','INPRD','INGPL'],
  INCHP:['INVTZ','INGVP','INGPL'],
}

const DIST = { AU:'4,800 NM', ID:'2,200 NM', US:'11,500 NM', MZ:'5,600 NM', RU:'7,200 NM' }

const ROUTE_COLORS = { R1:'#003087', R2:'#e65100', R3:'#1b5e20' }
const ROUTE_LABELS = { R1:'Primary (Malacca)', R2:'Alternate', R3:'Deep Water / Safe' }

// ── CSS injection ─────────────────────────────────────────────────────────────
let cssInjected = false
function injectCSS() {
  if (cssInjected) return; cssInjected = true
  const s = document.createElement('style')
  s.textContent = `
    @keyframes vBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.82)} }
    @keyframes pPulse  { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(2.1);opacity:.1} }
    .v-blink { animation:vBlink 1.9s ease-in-out infinite }
    .p-pulse { position:absolute;top:-5px;left:-5px;width:24px;height:24px;border-radius:50%;
               background:rgba(211,47,47,.25);animation:pPulse 1.9s infinite;pointer-events:none }
  `
  document.head.appendChild(s)
}

// ── Icon builders ─────────────────────────────────────────────────────────────
function vesselIco() {
  return L.divIcon({
    html:`<div class="v-blink" title="Click for vessel details" style="
      width:30px;height:30px;border-radius:50%;background:#003087;
      border:3px solid #C8A84B;box-shadow:0 2px 10px rgba(0,48,135,.6);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;color:white;cursor:pointer;font-family:Arial,sans-serif">V</div>`,
    className:'', iconAnchor:[15,15],
  })
}

function portIco(avail, isDest) {
  const bg = avail ? '#1565c0' : '#d32f2f'
  const bd = isDest ? '3px solid #C8A84B' : '2px solid white'
  const sz = isDest ? 20 : 14
  const ring = !avail ? `<div class="p-pulse"></div>` : ''
  return L.divIcon({
    html:`<div style="position:relative;display:inline-block">
      ${ring}
      <div title="Click for port details" style="width:${sz}px;height:${sz}px;border-radius:50%;
           background:${bg};border:${bd};box-shadow:0 2px 6px rgba(0,0,0,.3);
           position:relative;z-index:2;cursor:pointer"></div>
    </div>`,
    className:'', iconAnchor:[sz/2,sz/2], popupAnchor:[0,-(sz/2+4)],
  })
}

function originIco() {
  return L.divIcon({
    html:`<div style="width:16px;height:16px;border-radius:50%;background:#C8A84B;
          border:2px solid #003087;box-shadow:0 0 10px rgba(200,168,75,.8)"></div>`,
    className:'', iconAnchor:[8,8],
  })
}

// ── Score bar helper ──────────────────────────────────────────────────────────
function ScoreBar({ score, color }) {
  const bg = score >= 70 ? '#1b5e20' : score >= 45 ? '#e65100' : '#b71c1c'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, background:'#e8ecf4', borderRadius:3, height:6, overflow:'hidden' }}>
        <div style={{ height:6, background: color || bg, borderRadius:3, width:`${score}%`, transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color: color || bg, width:26, textAlign:'right' }}>{score}</span>
    </div>
  )
}

// ── Route Picker Panel ────────────────────────────────────────────────────────
function RoutePicker({ routes, selectedRoute, recommendedRoute, onSelect, recommendation, savingInr }) {
  if (!routes || routes.length === 0) return null

  return (
    <div style={{
      position:'absolute', top:12, right:12, zIndex:1000, width:320,
      background:'white', border:'1px solid #dde3f4', borderRadius:9,
      boxShadow:'0 4px 20px rgba(0,48,135,0.18)', overflow:'hidden',
    }}>
      {/* Panel header */}
      <div style={{ background:'#003087', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:'white', fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'0.07em' }}>
            AI Route Optimization
          </div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, marginTop:2 }}>
            {routes.length} routes analysed
          </div>
        </div>
        <div style={{ background:'#C8A84B', color:'#003087', fontSize:10, fontWeight:800,
                      padding:'3px 8px', borderRadius:4, textTransform:'uppercase' }}>
          AI Pick: {recommendedRoute}
        </div>
      </div>

      {/* AI recommendation text */}
      <div style={{ padding:'8px 12px', background:'#eff6ff', borderBottom:'1px solid #dde3f4',
                    fontSize:11, color:'#003087', lineHeight:1.5 }}>
        {recommendation}
        {savingInr > 0 && (
          <span style={{ display:'block', fontWeight:700, color:'#1b5e20', marginTop:3 }}>
            Saving vs worst route: Rs.{(savingInr/1e5).toFixed(1)} Lakhs
          </span>
        )}
      </div>

      {/* Route cards */}
      <div style={{ padding:10, display:'flex', flexDirection:'column', gap:8 }}>
        {routes.map(r => {
          const isSelected  = r.route_id === selectedRoute
          const isRecommended = r.route_id === recommendedRoute
          const color = ROUTE_COLORS[r.route_id] || '#003087'
          return (
            <div key={r.route_id}
              onClick={() => onSelect(r.route_id)}
              style={{
                border: isSelected ? `2px solid ${color}` : '1px solid #dde3f4',
                borderRadius:7, padding:'10px 12px', cursor:'pointer',
                background: isSelected ? `${color}08` : 'white',
                transition:'all 0.15s',
              }}>
              {/* Route header */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                {/* Color dot */}
                <div style={{ width:10, height:10, borderRadius:'50%', background:color,
                              border:'2px solid white', boxShadow:`0 0 0 2px ${color}`, flexShrink:0 }} />
                <span style={{ fontWeight:700, fontSize:12, color:'#1a2340', flex:1 }}>
                  {r.route_id} — {r.name.split(' (')[0]}
                </span>
                {isRecommended && (
                  <span style={{ background:'#C8A84B', color:'#003087', fontSize:9,
                                  fontWeight:800, padding:'1px 6px', borderRadius:3 }}>
                    AI BEST
                  </span>
                )}
              </div>

              {/* Key metrics row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:8 }}>
                {[
                  { l:'Days',    v:`${r.sea_days}d`,   hi: r.sea_days <= routes[0]?.sea_days },
                  { l:'Cost',    v:`$${(r.total_cost_usd/1000).toFixed(0)}k` },
                  { l:'Risk',    v:r.risk_score,        lo: r.risk_score <= 20 },
                ].map(m => (
                  <div key={m.l} style={{ background:'#f5f7fc', borderRadius:5, padding:'5px 6px', textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase' }}>{m.l}</div>
                    <div style={{ fontSize:12, fontWeight:800,
                                   color: m.hi ? '#1b5e20' : m.lo ? '#1b5e20' : '#1a2340' }}>{m.v}</div>
                  </div>
                ))}
              </div>

              {/* Score bars */}
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {[
                  { l:'Time',   s:r.time_score,     c:'#003087' },
                  { l:'Cost',   s:r.cost_score,     c:'#1565c0' },
                  { l:'Safety', s:r.safety_score,   c:'#1b5e20' },
                ].map(b => (
                  <div key={b.l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:9, color:'#6b7a9e', width:36 }}>{b.l}</span>
                    <ScoreBar score={b.s} color={b.c} />
                  </div>
                ))}
              </div>

              {/* Composite score */}
              <div style={{ marginTop:7, display:'flex', justifyContent:'space-between',
                            alignItems:'center', paddingTop:6, borderTop:'1px solid #eef1fa' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:9, color:'#6b7a9e' }}>Composite</span>
                  <ScoreBar score={r.composite_score} color={color} />
                </div>
                <span style={{ fontSize:10, color:'#6b7a9e' }}>
                  {r.traffic_density} traffic
                </span>
              </div>

              {/* Chokepoints */}
              {r.chokepoints.length > 0 && (
                <div style={{ marginTop:5, fontSize:10, color:'#e65100',
                              background:'#fff8e1', padding:'3px 7px',
                              borderRadius:4, border:'1px solid #ffe082' }}>
                  Chokepoints: {r.chokepoints.join(', ')}
                </div>
              )}

              {/* Notes */}
              <div style={{ marginTop:5, fontSize:10, color:'#6b7a9e', lineHeight:1.5 }}>
                {r.notes}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ padding:'8px 12px', borderTop:'1px solid #eef1fa',
                    display:'flex', gap:14, flexWrap:'wrap', background:'#f8f9fd' }}>
        {Object.entries(ROUTE_COLORS).map(([id, c]) => (
          <div key={id} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:20, height:3, background:c, borderRadius:2,
                          border: id === 'R2' ? '1px dashed' : id === 'R3' ? '1px dotted' : 'none' }} />
            <span style={{ fontSize:9, color:'#6b7a9e' }}>{id}</span>
          </div>
        ))}
        <span style={{ fontSize:9, color:'#6b7a9e', marginLeft:'auto' }}>Click route to select</span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RouteMap({
  originId    = 'AU',
  destPortId  = 'INPRD',
  month       = 11,
  vesselData  = null,
  onVesselClick,
  onPortClick,
}) {
  const mapDiv       = useRef(null)
  const mapObj       = useRef(null)
  const layersRef    = useRef([])
  const routeLinesRef= useRef({})   // {R1: polyline, R2: polyline, R3: polyline}
  const containerRef = useRef(null)

  const [congestion,    setCongestion]    = useState({})
  const [routes,        setRoutes]        = useState([])
  const [selectedRoute, setSelectedRoute] = useState('R1')
  const [recommended,   setRecommended]   = useState('R1')
  const [routeNote,     setRouteNote]     = useState('')
  const [savingInr,     setSavingInr]     = useState(0)
  const [initialized,   setInitialized]   = useState(false)
  const [fullscreen,    setFullscreen]    = useState(false)
  const [routeLoading,  setRouteLoading]  = useState(true)

  const onVesselRef = useRef(onVesselClick)
  const onPortRef   = useRef(onPortClick)
  useEffect(() => { onVesselRef.current = onVesselClick }, [onVesselClick])
  useEffect(() => { onPortRef.current   = onPortClick   }, [onPortClick])

  // ── Fetch congestion ────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/api/whatif/port-intelligence?month=${month}`)
      .then(d => {
        const m = {}; d.reports.forEach(r => { m[r.port_id] = r }); setCongestion(m)
      }).catch(() => {})
  }, [month])

  // ── Fetch routes ────────────────────────────────────────────────────────
  useEffect(() => {
    setRouteLoading(true)
    const freight = 11.2  // default; will be overridden by vesselData context
    const draft   = vesselData?.draft_m || 13.8
    apiFetch(`/api/routes?origin_id=${originId}&port_id=${destPortId}&cargo_mt=${vesselData?.cargo_mt||80000}&vessel_draft=${draft}&month=${month}&freight_rate=${freight}&priority=balanced`)
      .then(d => {
        setRoutes(d.routes || [])
        setRecommended(d.recommended_route || 'R1')
        setSelectedRoute(d.recommended_route || 'R1')
        setRouteNote(d.recommendation || '')
        setSavingInr(d.saving_vs_worst_inr || 0)
      })
      .catch(() => {})
      .finally(() => setRouteLoading(false))
  }, [originId, destPortId, month])

  // ── Toggle fullscreen ───────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    setFullscreen(f => {
      setTimeout(() => mapObj.current?.invalidateSize(), 60)
      return !f
    })
  }, [])

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current || !mapDiv.current) return
    injectCSS()

    const map = L.map(mapDiv.current, { center:[12,82], zoom:4, zoomControl:true })

    // OpenStreetMap — English labels, no API key
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom:19, crossOrigin:true,
    }).addTo(map)

    mapObj.current = map
    setInitialized(true)

    return () => {
      map.remove(); mapObj.current = null
    }
  }, [])

  // ── Draw routes + markers when routes/congestion/selection changes ───────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !initialized) return

    // Clear all layers
    layersRef.current.forEach(l => { try { map.removeLayer(l) } catch {} })
    layersRef.current = []
    routeLinesRef.current = {}

    if (routes.length === 0) return

    // ── Draw all route polylines ────────────────────────────────────────
    routes.forEach(route => {
      const isSelected = route.route_id === selectedRoute
      const color = ROUTE_COLORS[route.route_id] || '#003087'
      const weight = isSelected ? 4 : 2
      const opacity = isSelected ? 0.9 : 0.35
      const dashArray = route.route_id === 'R2' ? '10 6' : route.route_id === 'R3' ? '5 5' : null

      const line = L.polyline(route.waypoints, {
        color, weight, opacity,
        dashArray: dashArray || undefined,
      }).addTo(map)

      // Tooltip on hover
      line.bindTooltip(
        `<b>${route.route_id}: ${route.name}</b><br>` +
        `${route.sea_days} days &nbsp;|&nbsp; $${(route.total_cost_usd/1000).toFixed(0)}k &nbsp;|&nbsp; Risk: ${route.risk_score}`,
        { sticky:true, className:'leaflet-tooltip' }
      )
      line.on('click', () => setSelectedRoute(route.route_id))

      routeLinesRef.current[route.route_id] = line
      layersRef.current.push(line)

      // Route label at midpoint
      const wps = route.waypoints
      const midIdx = Math.floor(wps.length / 2)
      const midPt  = wps[midIdx]
      const label  = L.marker(midPt, {
        icon: L.divIcon({
          html:`<div style="background:${color};color:white;font-size:9px;font-weight:700;
                padding:2px 6px;border-radius:3px;white-space:nowrap;opacity:${isSelected?1:0.5}">
                ${route.route_id}</div>`,
          className:'', iconAnchor:[15,8],
        }),
        zIndexOffset: isSelected ? 50 : 0,
        interactive: false,
      }).addTo(map)
      layersRef.current.push(label)
    })

    // ── Origin marker ────────────────────────────────────────────────────
    const orig = ORIGINS[originId]
    if (orig) {
      const om = L.marker([orig.lat, orig.lon], { icon: originIco() })
        .addTo(map)
        .bindPopup(`<b>${orig.name}</b><br><span style="font-size:11px;color:#666">Origin Loading Port</span>`)
      layersRef.current.push(om)
    }

    // ── Port markers ─────────────────────────────────────────────────────
    EC_PORTS.forEach(port => {
      const cong  = congestion[port.id]
      const level = cong?.congestion?.level || cong?.alert_level || 'LOW'
      const avail = level !== 'HIGH' && level !== 'CRITICAL'
      const isDest= port.id === destPortId
      const wait  = cong?.congestion?.avg_wait_days ?? '—'

      const m = L.marker([port.lat, port.lon], {
        icon: portIco(avail, isDest), zIndexOffset: isDest ? 200 : 0,
      }).addTo(map)

      const sc = avail ? '#1565c0' : '#d32f2f'
      m.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;font-size:12px">
          <div style="font-weight:800;font-size:13px;color:#003087;margin-bottom:7px;
               border-bottom:1px solid #eee;padding-bottom:5px">
            ${port.name}${isDest ? ' [Destination]' : ''}
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#888;font-size:11px;padding:2px 0">Max Draft</td>
                <td style="font-weight:600;font-size:11px">${port.maxDraft}m</td></tr>
            <tr><td style="color:#888;font-size:11px;padding:2px 0">Berths</td>
                <td style="font-weight:600;font-size:11px">${port.berths}</td></tr>
            <tr><td style="color:#888;font-size:11px;padding:2px 0">Congestion</td>
                <td style="font-weight:700;font-size:11px;color:${sc}">${level}</td></tr>
            <tr><td style="color:#888;font-size:11px;padding:2px 0">Avg Wait</td>
                <td style="font-weight:600;font-size:11px">${wait}d</td></tr>
          </table>
          <div style="margin-top:8px;padding:4px 8px;border-radius:4px;font-size:10px;
               color:#003087;font-weight:600;text-align:center;border-top:1px solid #eee">
            Click for full port dashboard
          </div>
        </div>
      `, { maxWidth:220 })
      m.on('click', () => onPortRef.current?.(port.id))
      layersRef.current.push(m)
    })

    // ── Vessel marker at origin ─────────────────────────────────────────
    const selRoute = routes.find(r => r.route_id === selectedRoute) || routes[0]
    if (selRoute?.waypoints?.length) {
      const vm = L.marker(selRoute.waypoints[0], { icon: vesselIco(), zIndexOffset:1000 }).addTo(map)
      vm.on('click', () => onVesselRef.current?.())
      vm.bindTooltip('Click for vessel dashboard', { direction:'top', offset:[0,-16] })
      layersRef.current.push(vm)
    }

    // Fit map to selected route
    const selLine = routeLinesRef.current[selectedRoute]
    if (selLine) {
      try { map.fitBounds(selLine.getBounds().pad(0.12)) } catch {}
    }

  }, [routes, selectedRoute, congestion, initialized, originId, destPortId])

  // Auto-divert check
  const VESSEL_DRAFTS = { Handymax:11.5, Supramax:12.5, Ultramax:12.8, Panamax:13.5, Kamsarmax:13.8, Capesize:18.2 }
  const vDraft    = VESSEL_DRAFTS[vesselData?.vessel_type || 'Kamsarmax'] || 13.8
  const destPort  = EC_PORTS.find(p => p.id === destPortId)
  const divertNeeded = vDraft > (destPort?.maxDraft || 17)
  const divertPorts  = divertNeeded
    ? (NEARBY[destPortId]||[]).map(id => EC_PORTS.find(p=>p.id===id)).filter(p => p && p.maxDraft >= vDraft)
    : []

  const origInfo    = ORIGINS[originId]
  const selRouteObj = routes.find(r => r.route_id === selectedRoute)

  return (
    <div ref={containerRef} className="card"
      style={{
        overflow:'hidden', position:'relative',
        ...(fullscreen ? { position:'fixed', inset:0, zIndex:9000, borderRadius:0,
                           display:'flex', flexDirection:'column' } : {}),
      }}>

      {/* ── Header ── */}
      <div style={{ background:'#003087', padding:'10px 16px', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <span style={{ color:'white', fontSize:11, fontWeight:700,
                         textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Route Map — Multi-Route AI Optimization
          </span>
          <span style={{ color:'rgba(255,255,255,0.55)', fontSize:10, marginLeft:12 }}>
            {origInfo?.name?.split(',')[0]} &rarr; {destPort?.name}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {selRouteObj && (
            <span style={{ color:'#C8A84B', fontSize:11, fontWeight:700 }}>
              {selRouteObj.route_id}: {selRouteObj.sea_days}d &nbsp;|&nbsp; ${(selRouteObj.total_cost_usd/1000).toFixed(0)}k
            </span>
          )}
          {/* Fullscreen button */}
          <button onClick={toggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
                     color:'white', borderRadius:5, width:28, height:28, cursor:'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
            {fullscreen ? 'X' : '[  ]'}
          </button>
        </div>
      </div>

      {/* ── Legend bar ── */}
      <div style={{ background:'#f8f9fd', borderBottom:'1px solid #dde3f4', flexShrink:0,
                    padding:'7px 16px', display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
        <LegItem color="#1565c0" label="Port Available" />
        <LegItem color="#d32f2f" label="High Congestion" pulse />
        <LegItem color="#C8A84B" label="Origin Port" />
        <LegItem color="#003087" border="#C8A84B" label="Destination" />
        {Object.entries(ROUTE_COLORS).map(([id, c]) => (
          <LegItem key={id} color={c} label={`Route ${id}`}
            dash={id==='R2' ? '8 5' : id==='R3' ? '4 4' : null} />
        ))}
        {routeLoading && <span style={{ fontSize:10, color:'#6b7a9e' }}>Loading routes…</span>}
        {divertNeeded && (
          <span style={{ fontSize:10, fontWeight:700, color:'#d32f2f', background:'#ffebee',
                         border:'1px solid #ef9a9a', padding:'2px 8px', borderRadius:4, marginLeft:'auto' }}>
            AUTO-DIVERT ACTIVE
          </span>
        )}
      </div>

      {/* ── Divert banner ── */}
      {divertNeeded && divertPorts.length > 0 && (
        <div style={{ background:'#fff3e0', borderBottom:'1px solid #ffcc80', flexShrink:0,
                      padding:'7px 16px', display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#e65100', flexShrink:0 }} />
          <span style={{ color:'#e65100' }}>
            <strong>Port Divert Alert:</strong> Vessel ({vDraft}m) exceeds {destPort?.name} limit ({destPort?.maxDraft}m).
            &nbsp;Nearest compatible ports: <strong>{divertPorts.map(p => `${p.name} (${p.maxDraft}m)`).join(', ')}</strong>
          </span>
        </div>
      )}

      {/* ── Map + Route Picker overlay ── */}
      <div style={{ position:'relative', flex:1 }}>
        <div ref={mapDiv} style={{ height: fullscreen ? undefined : 480, minHeight:320, width:'100%' }} />

        {/* Route picker — floating panel over map */}
        {routes.length > 0 && (
          <RoutePicker
            routes={routes}
            selectedRoute={selectedRoute}
            recommendedRoute={recommended}
            onSelect={setSelectedRoute}
            recommendation={routeNote}
            savingInr={savingInr}
          />
        )}
      </div>

      {/* ── Route summary bar ── */}
      <div style={{ padding:'11px 16px', background:'#f8f9fd', borderTop:'1px solid #dde3f4',
                    flexShrink:0, display:'flex', flexWrap:'wrap', gap:'6px 32px' }}>
        {selRouteObj ? [
          { l:'Selected Route', v:`${selRouteObj.route_id} — ${selRouteObj.name.split(' (')[0]}` },
          { l:'Distance',       v:`${selRouteObj.distance_nm.toLocaleString()} NM` },
          { l:'Transit Time',   v:`${selRouteObj.sea_days} days` },
          { l:'Total Cost',     v:`$${(selRouteObj.total_cost_usd/1000).toFixed(0)}k (Rs.${(selRouteObj.total_cost_inr/1e5).toFixed(1)}L)` },
          { l:'Risk Score',     v:`${selRouteObj.risk_score}/100` },
          { l:'Chokepoints',    v: selRouteObj.chokepoints.length ? selRouteObj.chokepoints.join(', ') : 'None' },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.l}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#003087', marginTop:1 }}>{s.v}</div>
          </div>
        )) : [
          { l:'Origin',       v: origInfo?.name || originId },
          { l:'Destination',  v: destPort?.name || destPortId },
          { l:'Distance',     v: DIST[originId] || 'N/A' },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.l}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#003087', marginTop:1 }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegItem({ color, border, label, pulse, dash }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ position:'relative', width:20, height:10, flexShrink:0 }}>
        {pulse && (
          <div style={{ position:'absolute', top:-4, left:-4, width:18, height:18, borderRadius:'50%',
                        background:'rgba(211,47,47,0.2)', animation:'pPulse 1.9s infinite' }} />
        )}
        {dash ? (
          <div style={{ width:20, height:3, background:color, borderRadius:1, marginTop:3,
                        borderTop: dash ? `2px ${dash.includes('8') ? 'dashed' : 'dotted'} ${color}` : 'none',
                        background:'transparent' }} />
        ) : (
          <div style={{ width:14, height:14, borderRadius:'50%', background: color,
                        border: border ? `2px solid ${border}` : '1px solid rgba(0,0,0,0.12)',
                        position:'relative', zIndex:1 }} />
        )}
      </div>
      <span style={{ fontSize:10, color:'#6b7a9e' }}>{label}</span>
    </div>
  )
}
