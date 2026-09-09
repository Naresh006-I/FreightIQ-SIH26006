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
    /* When only the map div goes fullscreen via browser native API */
    .sail-map-container:fullscreen,
    .sail-map-container:-webkit-full-screen,
    .sail-map-container:-moz-full-screen {
      width: 100vw !important;
      height: 100vh !important;
    }
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
  const bg = color || (score >= 70 ? '#1b5e20' : score >= 45 ? '#e65100' : '#b71c1c')
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, background:'#e8ecf4', borderRadius:3, height:6, overflow:'hidden' }}>
        <div style={{ height:6, background:bg, borderRadius:3, width:`${score}%`, transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:bg, width:26, textAlign:'right' }}>{score}</span>
    </div>
  )
}

// ── Route Tab Buttons (shown above or below map) ──────────────────────────────
function RouteTabs({ routes, selectedRoute, recommendedRoute, onSelect }) {
  if (!routes || routes.length === 0) return null
  return (
    <div style={{ display:'flex', gap:8, padding:'10px 16px',
                  background:'white', borderBottom:'1px solid #dde3f4', flexShrink:0 }}>
      <span style={{ fontSize:11, color:'#6b7a9e', alignSelf:'center',
                     fontWeight:600, marginRight:4, textTransform:'uppercase',
                     letterSpacing:'0.05em' }}>
        Select Route:
      </span>
      {routes.map(r => {
        const isSelected  = r.route_id === selectedRoute
        const isRec       = r.route_id === recommendedRoute
        const color       = ROUTE_COLORS[r.route_id] || '#003087'
        return (
          <button key={r.route_id} onClick={() => onSelect(r.route_id)}
            style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'7px 16px', borderRadius:6, cursor:'pointer', fontSize:12,
              fontWeight: isSelected ? 700 : 500,
              background: isSelected ? color : 'white',
              color:      isSelected ? 'white' : '#1a2340',
              border:     isSelected ? `2px solid ${color}` : `1px solid ${color}40`,
              transition: 'all 0.15s',
            }}>
            {/* Color line indicator */}
            <div style={{
              width:16, height:3, borderRadius:2,
              background: r.route_id === 'R1' ? (isSelected ? 'white' : color) : 'transparent',
              borderTop: r.route_id === 'R2' ? `2px dashed ${isSelected ? 'white' : color}` :
                         r.route_id === 'R3' ? `2px dotted ${isSelected ? 'white' : color}` : 'none',
            }} />
            <span>{r.route_id}</span>
            <span style={{ opacity:0.8 }}>{r.name.split(' (')[0].split(' via ')[0].replace('Via ','').split(' ')[0]}</span>
            {isRec && (
              <span style={{ fontSize:9, background: isSelected ? 'rgba(255,255,255,0.25)' : '#C8A84B',
                              color: isSelected ? 'white' : '#003087',
                              padding:'1px 5px', borderRadius:3, fontWeight:800 }}>
                AI
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── AI Route Analysis Sub-Panel (shown below map when route is selected) ──────
function RouteAnalysisPanel({ route, recommendedRoute, savingInr }) {
  if (!route) return null
  const color  = ROUTE_COLORS[route.route_id] || '#003087'
  const isRec  = route.route_id === recommendedRoute

  const riskLevelColor = route.risk_score < 25 ? '#1b5e20' : route.risk_score < 55 ? '#e65100' : '#b71c1c'
  const riskLabel      = route.risk_score < 25 ? 'LOW' : route.risk_score < 55 ? 'MEDIUM' : 'HIGH'

  return (
    <div style={{ borderTop:'1px solid #dde3f4', background:'#f8f9fd', flexShrink:0 }}>
      {/* Section header */}
      <div style={{ background: color, padding:'10px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <span style={{ color:'white', fontWeight:800, fontSize:13 }}>
            Route {route.route_id} — {route.name}
          </span>
          {isRec && (
            <span style={{ marginLeft:10, background:'#C8A84B', color:'#003087',
                            fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:3 }}>
              AI RECOMMENDED
            </span>
          )}
        </div>
        <span style={{ color:'rgba(255,255,255,0.8)', fontSize:11 }}>
          AI Route Optimization Analysis
        </span>
      </div>

      <div style={{ padding:'16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14 }}>

        {/* KPI 1 — Transit */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7,
                      padding:'12px 14px', borderLeft:`4px solid ${color}` }}>
          <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                        letterSpacing:'0.07em', marginBottom:5 }}>Transit Time</div>
          <div style={{ fontSize:22, fontWeight:900, color }}>
            {route.sea_days}<span style={{ fontSize:12, fontWeight:400, color:'#6b7a9e' }}> days</span>
          </div>
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>
            {route.distance_nm.toLocaleString()} NM total
          </div>
        </div>

        {/* KPI 2 — Cost */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7,
                      padding:'12px 14px', borderLeft:'4px solid #1565c0' }}>
          <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                        letterSpacing:'0.07em', marginBottom:5 }}>Total Cost</div>
          <div style={{ fontSize:18, fontWeight:900, color:'#003087' }}>
            ${(route.total_cost_usd/1000).toFixed(0)}k
          </div>
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>
            Rs.{(route.total_cost_inr/1e5).toFixed(1)} Lakhs
          </div>
        </div>

        {/* KPI 3 — Risk */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7,
                      padding:'12px 14px', borderLeft:`4px solid ${riskLevelColor}` }}>
          <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                        letterSpacing:'0.07em', marginBottom:5 }}>Risk Level</div>
          <div style={{ fontSize:22, fontWeight:900, color:riskLevelColor }}>{riskLabel}</div>
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>Score: {route.risk_score}/100</div>
        </div>

        {/* KPI 4 — Composite */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7,
                      padding:'12px 14px', borderLeft:'4px solid #C8A84B' }}>
          <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                        letterSpacing:'0.07em', marginBottom:5 }}>AI Score</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#003087' }}>
            {route.composite_score}<span style={{ fontSize:12, color:'#6b7a9e' }}>/100</span>
          </div>
          <div style={{ fontSize:11, color:'#6b7a9e', marginTop:4 }}>Composite (T+C+S)</div>
        </div>
      </div>

      {/* Score breakdown + details */}
      <div style={{ padding:'0 16px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        {/* Score bars */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7, padding:'14px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase',
                        letterSpacing:'0.07em', marginBottom:12 }}>AI Score Breakdown</div>
          {[
            { l:'Time Efficiency',  s:route.time_score,     c:'#003087' },
            { l:'Cost Efficiency',  s:route.cost_score,     c:'#1565c0' },
            { l:'Safety / Risk',    s:route.safety_score,   c:'#1b5e20' },
            { l:'Composite Score',  s:route.composite_score,c: color },
          ].map(b => (
            <div key={b.l} style={{ marginBottom:9 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11,
                            marginBottom:3, color:'#1a2340' }}>
                <span>{b.l}</span>
                <span style={{ fontWeight:700, color:b.c }}>{b.s}/100</span>
              </div>
              <ScoreBar score={b.s} color={b.c} />
            </div>
          ))}
        </div>

        {/* Route details */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:7, padding:'14px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#003087', textTransform:'uppercase',
                        letterSpacing:'0.07em', marginBottom:12 }}>Route Details</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { l:'Chokepoints',      v: route.chokepoints.length ? route.chokepoints.join(', ') : 'None' },
              { l:'Traffic Density',  v: route.traffic_density },
              { l:'Route Type',       v: route.route_type.replace('_',' ') },
              { l:'Voyage Cost',      v: `$${(route.voyage_cost_usd/1000).toFixed(0)}k` },
              { l:'Freight Cost',     v: `$${(route.freight_cost_usd/1000).toFixed(0)}k` },
              { l:'INR Total',        v: `Rs.${(route.total_cost_inr/1e5).toFixed(1)}L` },
            ].map(s => (
              <div key={s.l} style={{ background:'#f5f7fc', borderRadius:5, padding:'8px 10px' }}>
                <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase',
                              letterSpacing:'0.06em', marginBottom:3 }}>{s.l}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#003087' }}>{s.v}</div>
              </div>
            ))}
          </div>
          {/* Notes */}
          <div style={{ marginTop:10, fontSize:11, color:'#6b7a9e', lineHeight:1.6,
                        background:'#eff6ff', padding:'8px 10px', borderRadius:5,
                        border:'1px solid #c3d8f5' }}>
            {route.notes}
          </div>
          {savingInr > 0 && (
            <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:'#1b5e20',
                          background:'#e8f5e9', padding:'6px 10px', borderRadius:5,
                          border:'1px solid #a5d6a7' }}>
              Saving vs worst route: Rs.{(savingInr/1e5).toFixed(1)} Lakhs
            </div>
          )}
        </div>
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

  // ── Map-only fullscreen (native browser Fullscreen API on the map div) ──
  const toggleFullscreen = useCallback(() => {
    const el = mapDiv.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
        .then(() => { setTimeout(() => mapObj.current?.invalidateSize(), 60) })
        .catch(() => {
          // Fallback: expand map div height to fill viewport within card
          setFullscreen(f => { setTimeout(() => mapObj.current?.invalidateSize(), 60); return !f })
        })
    } else {
      document.exitFullscreen?.()
        .then(() => { setTimeout(() => mapObj.current?.invalidateSize(), 60) })
    }
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
    <div ref={containerRef} className="card" style={{ overflow:'hidden', position:'relative' }}>

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
          {/* Map-only Fullscreen button */}
          <button onClick={toggleFullscreen}
            title="Expand map to full screen (map only)"
            style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
                     color:'white', borderRadius:5, padding:'4px 10px', cursor:'pointer',
                     display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600 }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
            <span style={{ fontSize:14, lineHeight:1 }}>&#x2922;</span>
            Full Map
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

      {/* ── Route tab buttons ── */}
      {routes.length > 0 && (
        <RouteTabs
          routes={routes}
          selectedRoute={selectedRoute}
          recommendedRoute={recommended}
          onSelect={setSelectedRoute}
        />
      )}

      {/* ── Map + NO floating overlay ── */}
      <div style={{ position:'relative', flex:1 }}>
        <div ref={mapDiv} className="sail-map-container"
             style={{ height: fullscreen ? undefined : 400, minHeight:300, width:'100%' }} />
      </div>

      {/* ── Route summary bar ── */}
      <div style={{ padding:'9px 16px', background:'#f8f9fd', borderTop:'1px solid #dde3f4',
                    flexShrink:0, display:'flex', flexWrap:'wrap', gap:'6px 28px' }}>
        {selRouteObj ? [
          { l:'Selected Route', v:`${selRouteObj.route_id} — ${selRouteObj.name.split(' (')[0]}` },
          { l:'Distance',       v:`${selRouteObj.distance_nm.toLocaleString()} NM` },
          { l:'Transit',        v:`${selRouteObj.sea_days} days` },
          { l:'Cost',           v:`$${(selRouteObj.total_cost_usd/1000).toFixed(0)}k (Rs.${(selRouteObj.total_cost_inr/1e5).toFixed(1)}L)` },
          { l:'Risk',           v:`${selRouteObj.risk_score}/100` },
          { l:'Chokepoints',    v: selRouteObj.chokepoints.length ? selRouteObj.chokepoints.join(', ') : 'None' },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.l}</div>
            <div style={{ fontSize:11, fontWeight:600, color:'#003087', marginTop:1 }}>{s.v}</div>
          </div>
        )) : (
          <div style={{ fontSize:11, color:'#6b7a9e' }}>Select a route above to see details</div>
        )}
      </div>

      {/* ── AI Route Analysis Sub-Panel (below map, updates on route select) ── */}
      {selRouteObj && (
        <RouteAnalysisPanel
          route={selRouteObj}
          recommendedRoute={recommended}
          savingInr={savingInr}
        />
      )}
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
          <div style={{
            width:20, height:3, borderRadius:1, marginTop:3,
            background: 'transparent',
            borderTop: `2px ${dash.includes('8') ? 'dashed' : 'dotted'} ${color}`,
          }} />
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
