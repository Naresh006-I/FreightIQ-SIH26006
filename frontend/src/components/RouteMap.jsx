/**
 * RouteMap — Interactive Leaflet map for SIH26006
 *
 * Features:
 *  1. Origin → Destination route line (dashed, realistic sea waypoints)
 *  2. All 6 East Coast India ports as clickable markers
 *     - Blue  = Port Available (LOW / MEDIUM congestion)
 *     - Red   = High Congestion / Unavailable
 *  3. Origin port marker (gold dot)
 *  4. Animated vessel tracker moving along the route
 *  5. Click any port → popup with details
 */

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from '../config'

// Fix default marker icon path broken by Vite bundler
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── East Coast India ports ────────────────────────────────────────────────────
const EC_PORTS = [
  { id:'INPRD', name:'Paradip',       lat:20.317, lon:86.611, state:'Odisha',         maxDraft:17.0, berths:12 },
  { id:'INVTZ', name:'Visakhapatnam', lat:17.686, lon:83.282, state:'Andhra Pradesh', maxDraft:14.5, berths:10 },
  { id:'INGVP', name:'Gangavaram',    lat:17.623, lon:83.226, state:'Andhra Pradesh', maxDraft:18.0, berths:8  },
  { id:'INGPL', name:'Gopalpur',      lat:19.263, lon:84.893, state:'Odisha',         maxDraft:12.5, berths:4  },
  { id:'INDMA', name:'Dhamra',        lat:20.892, lon:86.879, state:'Odisha',         maxDraft:16.5, berths:6  },
  { id:'INHAL', name:'Haldia',        lat:22.026, lon:88.069, state:'West Bengal',    maxDraft:8.5,  berths:9  },
]

// ── Origin ports ──────────────────────────────────────────────────────────────
const ORIGINS = {
  AU:{ name:'Newcastle, Australia',   lat:-32.92, lon:151.77 },
  ID:{ name:'Samarinda, Indonesia',   lat: -0.50, lon:117.15 },
  US:{ name:'Norfolk, United States', lat: 36.85, lon:-76.29 },
  MZ:{ name:'Maputo, Mozambique',     lat:-25.97, lon: 32.59 },
  RU:{ name:'Taman, Russia',          lat: 45.21, lon: 36.72 },
}

// ── Realistic sea-lane waypoints ──────────────────────────────────────────────
const SEA_ROUTES = {
  AU:[[-32.92,151.77],[1.37,103.82],[5.56,80.00]],          // via Malacca Strait
  ID:[[ -0.50,117.15],[3.00,100.00],[5.56,80.00]],          // via Malacca Strait
  US:[[ 36.85,-76.29],[30.61, 32.28],[12.60,43.90],[5.56,80.00]], // via Suez
  MZ:[[-25.97, 32.59],[-10.00,48.00],[ 0.00,63.00],[5.56,80.00]], // Indian Ocean
  RU:[[ 45.21, 36.72],[31.28, 32.28],[12.60,43.90],[5.56,80.00]], // via Suez
}

function buildRoute(originId, destId) {
  const wp   = SEA_ROUTES[originId] || [[0,80]]
  const dest = EC_PORTS.find(p => p.id === destId)
  return dest ? [...wp, [dest.lat, dest.lon]] : wp
}

function interpolate(pts, t) {
  if (!pts.length) return [15, 82]
  const n   = pts.length - 1
  const seg = Math.min(Math.floor(t * n), n - 1)
  const f   = t * n - seg
  const a   = pts[seg], b = pts[Math.min(seg + 1, n)]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

// ── Pulse animation CSS (injected once) ───────────────────────────────────────
let pulseCSS = false
function injectPulseCSS() {
  if (pulseCSS) return
  const s = document.createElement('style')
  s.textContent = `
    @keyframes mapPulse {
      0%,100%{ transform:scale(1);   opacity:.9; }
      50%    { transform:scale(1.9); opacity:.15; }
    }
    .pulse-ring {
      position:absolute; top:-6px; left:-6px;
      width:26px; height:26px; border-radius:50%;
      background:rgba(211,47,47,0.3);
      animation:mapPulse 1.6s infinite;
    }
  `
  document.head.appendChild(s)
  pulseCSS = true
}

// ── Port marker icon ──────────────────────────────────────────────────────────
function portIcon(isAvailable, isDest, size = 14) {
  const bg      = isAvailable ? '#1565c0' : '#d32f2f'
  const border  = isDest ? '3px solid #C8A84B' : '2px solid white'
  const sz      = isDest ? 18 : size
  const pulse   = !isAvailable
    ? `<div class="pulse-ring"></div>` : ''
  return L.divIcon({
    html: `<div style="position:relative;display:inline-block">
      ${pulse}
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${bg};
           border:${border};box-shadow:0 2px 6px rgba(0,0,0,.28);position:relative;z-index:2">
      </div>
    </div>`,
    className:  '',
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor:[0, -(sz / 2 + 4)],
  })
}

function originIcon() {
  return L.divIcon({
    html:`<div style="width:14px;height:14px;border-radius:50%;background:#C8A84B;
          border:2px solid #003087;box-shadow:0 0 8px rgba(200,168,75,.7)"></div>`,
    className:'', iconAnchor:[7,7],
  })
}

function vesselIcon() {
  return L.divIcon({
    html:`<div style="width:22px;height:22px;border-radius:50%;background:#003087;
          border:3px solid white;box-shadow:0 2px 8px rgba(0,48,135,.55);
          display:flex;align-items:center;justify-content:center;font-size:11px;color:white">
          &#9875;</div>`,
    className:'', iconAnchor:[11,11],
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RouteMap({ originId = 'AU', destPortId = 'INPRD', month = 11 }) {
  const mapDiv      = useRef(null)
  const mapObj      = useRef(null)
  const layers      = useRef([])          // track all added layers
  const animRef     = useRef(null)
  const progress    = useRef(0)

  const [congestion,   setCongestion]   = useState({})
  const [vesselPct,    setVesselPct]    = useState(0)
  const [initialized,  setInitialized]  = useState(false)

  // ── Fetch port congestion once ───────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/api/whatif/port-intelligence?month=${month}`)
      .then(d => {
        const m = {}
        d.reports.forEach(r => { m[r.port_id] = r })
        setCongestion(m)
      })
      .catch(() => {})
  }, [month])

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current || !mapDiv.current) return
    injectPulseCSS()

    const map = L.map(mapDiv.current, {
      center: [12, 82], zoom: 4,
      zoomControl: true,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution:'© OpenStreetMap, © CARTO', subdomains:'abcd', maxZoom:14 }
    ).addTo(map)

    mapObj.current = map
    setInitialized(true)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      map.remove()
      mapObj.current = null
    }
  }, [])

  // ── Rebuild overlays when origin/dest/congestion changes ─────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !initialized) return

    // Clear all previous layers
    layers.current.forEach(l => { try { map.removeLayer(l) } catch {} })
    layers.current = []
    if (animRef.current) cancelAnimationFrame(animRef.current)

    const route = buildRoute(originId, destPortId)

    // ── Route polyline ──
    const line = L.polyline(route, {
      color:'#003087', weight:2.5, opacity:.65, dashArray:'9 7',
    }).addTo(map)
    layers.current.push(line)

    // ── Origin marker ──
    const orig = ORIGINS[originId]
    if (orig) {
      const om = L.marker([orig.lat, orig.lon], { icon: originIcon() })
        .addTo(map)
        .bindPopup(`<b>${orig.name}</b><br><span style="font-size:11px;color:#666">Origin Loading Port</span>`)
      layers.current.push(om)
    }

    // ── East Coast port markers ──
    EC_PORTS.forEach(port => {
      const cong  = congestion[port.id]
      const level = cong?.congestion?.level || cong?.alert_level || 'LOW'
      const avail = level !== 'HIGH' && level !== 'CRITICAL'
      const isDest= port.id === destPortId
      const wait  = cong?.congestion?.avg_wait_days ?? cong?.total_delay_days ?? '—'

      const m = L.marker([port.lat, port.lon], { icon: portIcon(avail, isDest), zIndexOffset: isDest ? 200 : 0 })
        .addTo(map)

      const statusColor = avail ? '#1565c0' : '#d32f2f'
      const statusText  = !avail ? 'HIGH CONGESTION' : level === 'MEDIUM' ? 'MEDIUM — Monitor' : 'AVAILABLE'

      m.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;min-width:190px">
          <div style="font-weight:800;font-size:14px;color:#003087;margin-bottom:8px;
               border-bottom:1px solid #eee;padding-bottom:6px">
            ${port.name}${isDest ? '&nbsp;<span style="color:#C8A84B">★ Destination</span>' : ''}
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#888;padding:2px 0;font-size:11px">State</td>
                <td style="font-weight:600;font-size:11px">${port.state}</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Max Draft</td>
                <td style="font-weight:600;font-size:11px">${port.maxDraft} m</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Berths</td>
                <td style="font-weight:600;font-size:11px">${port.berths}</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Congestion</td>
                <td style="font-weight:700;font-size:11px;color:${statusColor}">${level}</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Avg Wait</td>
                <td style="font-weight:600;font-size:11px">${wait}d</td></tr>
          </table>
          <div style="margin-top:8px;padding:5px 10px;border-radius:4px;font-size:10px;font-weight:700;
               background:${avail ? '#e3f2fd' : '#ffebee'};color:${statusColor}">
            ${statusText}
          </div>
        </div>
      `, { maxWidth: 230 })

      layers.current.push(m)
    })

    // ── Vessel tracker ──
    const vm = L.marker(route[0], { icon: vesselIcon(), zIndexOffset: 500 })
      .addTo(map)
      .bindTooltip('Vessel in transit', { direction:'top', permanent:false })
    layers.current.push(vm)

    // ── Animate vessel ──
    const DURATION = 28000   // 28s for full route
    let lastTs = null
    progress.current = 0

    function tick(ts) {
      if (lastTs === null) lastTs = ts
      progress.current = Math.min(progress.current + (ts - lastTs) / DURATION, 1)
      lastTs = ts
      const pos = interpolate(route, progress.current)
      vm.setLatLng(pos)
      setVesselPct(Math.round(progress.current * 100))

      if (progress.current < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setTimeout(() => {
          progress.current = 0
          lastTs = null
          animRef.current = requestAnimationFrame(tick)
        }, 2500)
      }
    }
    animRef.current = requestAnimationFrame(tick)

    // Fit bounds
    try { map.fitBounds(line.getBounds().pad(0.2)) } catch {}

  }, [originId, destPortId, congestion, initialized])

  const destPort = EC_PORTS.find(p => p.id === destPortId)
  const origInfo = ORIGINS[originId]

  return (
    <div className="card" style={{ overflow:'hidden', gridColumn:'1 / -1' }}>

      {/* Header */}
      <div style={{ background:'#003087', padding:'10px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700,
                       textTransform:'uppercase', letterSpacing:'0.1em' }}>
          Route Map — Vessel Tracking
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:11 }}>
          <span style={{ color:'rgba(255,255,255,0.75)' }}>
            {origInfo?.name?.split(',').slice(-1)[0]?.trim() || originId}
            &nbsp;&#x2192;&nbsp;
            {destPort?.name || destPortId}
          </span>
          <span style={{ color:'#C8A84B', fontWeight:700 }}>
            {vesselPct < 100 ? `Vessel: ${vesselPct}% of route` : 'Vessel: Arrived'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background:'#f8f9fd', borderBottom:'1px solid #dde3f4',
                    padding:'7px 16px', display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
        <LegItem color="#1565c0" label="Port Available" />
        <LegItem color="#d32f2f" label="High Congestion / Unavailable" pulse />
        <LegItem color="#C8A84B" label="Origin Port" />
        <LegItem color="#003087" border="#C8A84B" label="Destination Port" />
        <span style={{ fontSize:10, color:'#6b7a9e', marginLeft:'auto' }}>
          Click any port marker for details
        </span>
      </div>

      {/* Map */}
      <div ref={mapDiv} style={{ height:440, width:'100%' }} />

      {/* Route summary bar */}
      <div style={{ padding:'11px 16px', background:'#f8f9fd', borderTop:'1px solid #dde3f4',
                    display:'flex', flexWrap:'wrap', gap:'6px 32px' }}>
        {[
          { l:'Origin',       v: origInfo?.name || originId },
          { l:'Destination',  v: destPort?.name || destPortId },
          { l:'Distance',     v: DIST[originId] },
          { l:'Sailing Time', v: TIME[originId] },
          { l:'Status',       v: vesselPct < 100 ? `In Transit (${vesselPct}%)` : 'Arrived' },
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

const DIST = { AU:'4,800 NM', ID:'2,200 NM', US:'11,500 NM', MZ:'5,600 NM', RU:'7,200 NM' }
const TIME = { AU:'~15 days', ID:'~7 days',  US:'~35 days',  MZ:'~17 days', RU:'~22 days' }

function LegItem({ color, border, label, pulse }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ position:'relative', width:13, height:13 }}>
        {pulse && (
          <div style={{ position:'absolute', top:-3, left:-3, width:19, height:19,
                        borderRadius:'50%', background:'rgba(211,47,47,0.2)',
                        animation:'mapPulse 1.6s infinite' }} />
        )}
        <div style={{ width:13, height:13, borderRadius:'50%', background:color,
                      border: border ? `2px solid ${border}` : '1px solid rgba(0,0,0,0.12)',
                      position:'relative', zIndex:1 }} />
      </div>
      <span style={{ fontSize:10, color:'#6b7a9e' }}>{label}</span>
    </div>
  )
}
