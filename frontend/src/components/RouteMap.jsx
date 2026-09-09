/**
 * RouteMap — Interactive Leaflet map  (SIH26006)
 *
 * Click vessel  → calls onVesselClick()  → App navigates to VesselDashboard
 * Click port    → calls onPortClick(id)  → App navigates to PortDashboard
 * Fullscreen    → map expands to fill viewport
 * OSM tiles     — no API key required
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from '../config'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const EC_PORTS = [
  { id:'INPRD', name:'Paradip',       lat:20.317, lon:86.611, state:'Odisha',         maxDraft:17.0, berths:12 },
  { id:'INVTZ', name:'Visakhapatnam', lat:17.686, lon:83.282, state:'Andhra Pradesh', maxDraft:14.5, berths:10 },
  { id:'INGVP', name:'Gangavaram',    lat:17.623, lon:83.226, state:'Andhra Pradesh', maxDraft:18.0, berths:8  },
  { id:'INGPL', name:'Gopalpur',      lat:19.263, lon:84.893, state:'Odisha',         maxDraft:12.5, berths:4  },
  { id:'INDMA', name:'Dhamra',        lat:20.892, lon:86.879, state:'Odisha',         maxDraft:16.5, berths:6  },
  { id:'INHAL', name:'Haldia',        lat:22.026, lon:88.069, state:'West Bengal',    maxDraft:8.5,  berths:9  },
]

const ORIGINS = {
  AU:{ name:'Newcastle, Australia',   lat:-32.92, lon:151.77 },
  ID:{ name:'Samarinda, Indonesia',   lat: -0.50, lon:117.15 },
  US:{ name:'Norfolk, United States', lat: 36.85, lon:-76.29 },
  MZ:{ name:'Maputo, Mozambique',     lat:-25.97, lon: 32.59 },
  RU:{ name:'Taman, Russia',          lat: 45.21, lon: 36.72 },
}

const SEA_ROUTES = {
  AU:[[-32.92,151.77],[-20.0,130.0],[1.37,103.82],[5.56,80.00]],
  ID:[[ -0.50,117.15],[3.00,100.50],[5.56,80.00]],
  US:[[ 36.85,-76.29],[30.61,32.28],[12.60,43.90],[5.56,80.00]],
  MZ:[[-25.97, 32.59],[-10.00,48.00],[0.00,63.00],[5.56,80.00]],
  RU:[[ 45.21, 36.72],[31.28,32.28],[12.60,43.90],[5.56,80.00]],
}

const NEARBY = {
  INPRD:['INGPL','INDMA','INGVP'], INVTZ:['INGVP','INGPL','INPRD'],
  INGVP:['INVTZ','INGPL','INPRD'], INGPL:['INVTZ','INGVP','INDMA'],
  INDMA:['INPRD','INGPL','INHAL'], INHAL:['INDMA','INPRD','INGPL'],
}

const DIST = { AU:'4,800 NM', ID:'2,200 NM', US:'11,500 NM', MZ:'5,600 NM', RU:'7,200 NM' }
const TIME = { AU:'~15 days', ID:'~7 days',  US:'~35 days',  MZ:'~17 days', RU:'~22 days' }

function buildRoute(oid, did) {
  const wp = SEA_ROUTES[oid] || [[0,80]]
  const d  = EC_PORTS.find(p => p.id === did)
  return d ? [...wp, [d.lat, d.lon]] : wp
}

function interpolate(pts, t) {
  const n = pts.length - 1
  const seg = Math.min(Math.floor(t * n), n - 1)
  const f   = t * n - seg
  const a = pts[seg], b = pts[Math.min(seg+1,n)]
  return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f]
}

let cssOnce = false
function injectCSS() {
  if (cssOnce) return; cssOnce = true
  const s = document.createElement('style')
  s.textContent = `
    @keyframes vBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.82)} }
    @keyframes pPulse  { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(2.1);opacity:.1} }
    .v-blink { animation:vBlink 1.9s ease-in-out infinite }
    .p-ring  { position:absolute;top:-5px;left:-5px;width:24px;height:24px;border-radius:50%;
               background:rgba(211,47,47,.25);animation:pPulse 1.9s infinite;pointer-events:none }
  `
  document.head.appendChild(s)
}

function vesselIco() {
  return L.divIcon({
    html:`<div class="v-blink" title="Click for vessel details" style="
      width:30px;height:30px;border-radius:50%;background:#003087;
      border:3px solid #C8A84B;box-shadow:0 2px 10px rgba(0,48,135,.6);
      display:flex;align-items:center;justify-content:center;
      font-size:15px;color:white;cursor:pointer">&#9875;</div>`,
    className:'', iconAnchor:[15,15],
  })
}

function portIco(avail, isDest) {
  const bg = avail ? '#1565c0' : '#d32f2f'
  const bd = isDest ? '3px solid #C8A84B' : '2px solid white'
  const sz = isDest ? 20 : 14
  const ring = !avail ? `<div class="p-ring"></div>` : ''
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function RouteMap({
  originId    = 'AU',
  destPortId  = 'INPRD',
  month       = 11,
  vesselData  = null,
  onVesselClick,       // () => void
  onPortClick,         // (portId: string) => void
}) {
  const mapDiv     = useRef(null)
  const mapObj     = useRef(null)
  const layersRef  = useRef([])
  const animRef    = useRef(null)
  const progRef    = useRef(0)
  const containerRef = useRef(null)

  const [congestion,  setCongestion]  = useState({})
  const [vesselPct,   setVesselPct]   = useState(0)
  const [initialized, setInitialized] = useState(false)
  const [fullscreen,  setFullscreen]  = useState(false)

  // stable callbacks
  const onVesselClickRef = useRef(onVesselClick)
  const onPortClickRef   = useRef(onPortClick)
  useEffect(() => { onVesselClickRef.current = onVesselClick }, [onVesselClick])
  useEffect(() => { onPortClickRef.current   = onPortClick   }, [onPortClick])

  // ── Congestion data ──────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/api/whatif/port-intelligence?month=${month}`)
      .then(d => {
        const m = {}; d.reports.forEach(r => { m[r.port_id] = r }); setCongestion(m)
      }).catch(() => {})
  }, [month])

  // ── Fullscreen toggle ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    setFullscreen(f => {
      const next = !f
      // Leaflet needs a size recalc after container resize
      setTimeout(() => { mapObj.current?.invalidateSize() }, 50)
      return next
    })
  }, [])

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current || !mapDiv.current) return
    injectCSS()

    const map = L.map(mapDiv.current, { center:[12,82], zoom:4, zoomControl:true })

    // ✅ OpenStreetMap — free, no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom:18,
    }).addTo(map)

    mapObj.current = map
    setInitialized(true)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      map.remove(); mapObj.current = null
    }
  }, [])

  // ── Rebuild overlays ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !initialized) return

    layersRef.current.forEach(l => { try { map.removeLayer(l) } catch {} })
    layersRef.current = []
    if (animRef.current) cancelAnimationFrame(animRef.current)

    const route = buildRoute(originId, destPortId)

    // Route polyline
    const line = L.polyline(route, { color:'#003087', weight:2.5, opacity:.6, dashArray:'10 7' }).addTo(map)
    layersRef.current.push(line)

    // Origin marker
    const orig = ORIGINS[originId]
    if (orig) {
      const om = L.marker([orig.lat, orig.lon], { icon: originIco() }).addTo(map)
        .bindPopup(`<b>${orig.name}</b><br><span style="font-size:11px;color:#666">Origin Loading Port</span>`)
      layersRef.current.push(om)
    }

    // Port markers
    EC_PORTS.forEach(port => {
      const cong  = congestion[port.id]
      const level = cong?.congestion?.level || cong?.alert_level || 'LOW'
      const avail = level !== 'HIGH' && level !== 'CRITICAL'
      const isDest= port.id === destPortId

      const m = L.marker([port.lat, port.lon], {
        icon: portIco(avail, isDest), zIndexOffset: isDest ? 200 : 0,
      }).addTo(map)

      const wait  = cong?.congestion?.avg_wait_days ?? '—'
      const util  = cong?.congestion?.utilisation_pct ?? 0
      const sc    = avail ? '#1565c0' : '#d32f2f'

      m.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;font-size:12px">
          <div style="font-weight:800;font-size:13px;color:#003087;margin-bottom:7px;
               border-bottom:1px solid #eee;padding-bottom:5px">
            ${port.name}${isDest ? ' <span style="color:#C8A84B">★</span>' : ''}
          </div>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Max Draft</td>
                <td style="font-weight:600;font-size:11px">${port.maxDraft}m</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Berths</td>
                <td style="font-weight:600;font-size:11px">${port.berths}</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Congestion</td>
                <td style="font-weight:700;font-size:11px;color:${sc}">${level}</td></tr>
            <tr><td style="color:#888;padding:2px 0;font-size:11px">Avg Wait</td>
                <td style="font-weight:600;font-size:11px">${wait}d</td></tr>
          </table>
          <div style="margin-top:8px;padding:5px 0;font-size:10px;color:#003087;font-weight:600;
               text-align:center;border-top:1px solid #eee">
            Click marker for full port dashboard
          </div>
        </div>
      `, { maxWidth:210 })

      m.on('click', () => { onPortClickRef.current?.(port.id) })
      layersRef.current.push(m)
    })

    // Vessel marker
    const vm = L.marker(route[0], { icon: vesselIco(), zIndexOffset:1000 }).addTo(map)
    vm.on('click', () => { onVesselClickRef.current?.() })
    vm.bindTooltip('Click for vessel dashboard', { direction:'top', offset:[0,-16] })
    layersRef.current.push(vm)

    // ── Slow realistic animation: 120s per cycle ──
    progRef.current = 0
    let lastTs = null

    function tick(ts) {
      if (lastTs === null) lastTs = ts
      progRef.current = Math.min(progRef.current + (ts - lastTs) / 120_000, 1)
      lastTs = ts
      vm.setLatLng(interpolate(route, progRef.current))
      setVesselPct(Math.round(progRef.current * 100))
      if (progRef.current < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setTimeout(() => { progRef.current = 0; lastTs = null; animRef.current = requestAnimationFrame(tick) }, 4000)
      }
    }
    animRef.current = requestAnimationFrame(tick)

    try { map.fitBounds(line.getBounds().pad(0.15)) } catch {}
  }, [originId, destPortId, congestion, initialized])

  // Auto-divert check
  const VESSEL_DRAFTS = { Handymax:11.5, Supramax:12.5, Ultramax:12.8, Panamax:13.5, Kamsarmax:13.8, Capesize:18.2 }
  const vDraft = VESSEL_DRAFTS[vesselData?.vessel_type || 'Kamsarmax'] || 13.8
  const destPort = EC_PORTS.find(p => p.id === destPortId)
  const divertNeeded = vDraft > (destPort?.maxDraft || 17)
  const divertPorts  = divertNeeded
    ? (NEARBY[destPortId]||[]).map(id => EC_PORTS.find(p=>p.id===id)).filter(p => p && p.maxDraft >= vDraft)
    : []

  const origInfo = ORIGINS[originId]

  return (
    <div
      ref={containerRef}
      className="card"
      style={{
        overflow:'hidden', position:'relative',
        ...(fullscreen ? {
          position:'fixed', inset:0, zIndex:9000, borderRadius:0,
          display:'flex', flexDirection:'column',
        } : {}),
      }}
    >
      {/* Header */}
      <div style={{ background:'#003087', padding:'10px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    flexShrink:0 }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700,
                       textTransform:'uppercase', letterSpacing:'0.1em' }}>
          Route Map — Vessel Tracking
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'rgba(255,255,255,.75)', fontSize:11 }}>
            {origInfo?.name?.split(',')[0]} &nbsp;&#x2192;&nbsp; {destPort?.name}
          </span>
          <span style={{ color:'#C8A84B', fontWeight:700, fontSize:11 }}>
            Vessel: {vesselPct < 100 ? `${vesselPct}% of route` : 'Arrived'}
          </span>
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
                     color:'white', borderRadius:5, width:30, height:30, cursor:'pointer',
                     display:'flex', alignItems:'center', justifyContent:'center',
                     fontSize:14, transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
          >
            {fullscreen ? '⛶' : '⛶'}
            <span style={{ fontSize:16 }}>{fullscreen ? '✕' : '⤢'}</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background:'#f8f9fd', borderBottom:'1px solid #dde3f4',
                    padding:'7px 16px', display:'flex', alignItems:'center',
                    gap:18, flexWrap:'wrap', flexShrink:0 }}>
        <LegItem color="#1565c0" label="Port Available" />
        <LegItem color="#d32f2f" label="High Congestion" pulse />
        <LegItem color="#C8A84B" label="Origin Port" />
        <LegItem color="#003087" border="#C8A84B" label="Destination Port" />
        <LegItem vessel label="Vessel — click for dashboard" />
        <span style={{ fontSize:10, color:'#6b7a9e', marginLeft:'auto' }}>
          Click any port marker for port dashboard
        </span>
        {divertNeeded && (
          <span style={{ fontSize:10, fontWeight:700, color:'#d32f2f',
                         background:'#ffebee', border:'1px solid #ef9a9a',
                         padding:'2px 8px', borderRadius:4 }}>
            AUTO-DIVERT ACTIVE
          </span>
        )}
      </div>

      {/* Divert banner */}
      {divertNeeded && divertPorts.length > 0 && (
        <div style={{ background:'#fff3e0', borderBottom:'1px solid #ffcc80',
                      padding:'8px 16px', display:'flex', alignItems:'center',
                      gap:10, flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#e65100', flexShrink:0 }} />
          <div style={{ fontSize:12, color:'#e65100' }}>
            <strong>Port Divert Alert:</strong> Vessel draft ({vDraft}m) exceeds {destPort?.name} limit ({destPort?.maxDraft}m).
            &nbsp;Nearest compatible ports:&nbsp;
            <strong>{divertPorts.map(p => `${p.name} (${p.maxDraft}m)`).join(', ')}</strong>
          </div>
        </div>
      )}

      {/* Map */}
      <div ref={mapDiv} style={{ flex:1, height: fullscreen ? undefined : 440, minHeight:300, width:'100%' }} />

      {/* Route summary */}
      <div style={{ padding:'11px 16px', background:'#f8f9fd',
                    borderTop:'1px solid #dde3f4', display:'flex',
                    flexWrap:'wrap', gap:'6px 32px', flexShrink:0 }}>
        {[
          { l:'Origin',      v: origInfo?.name || originId },
          { l:'Destination', v: destPort?.name || destPortId },
          { l:'Distance',    v: DIST[originId] },
          { l:'Sailing Time',v: TIME[originId] },
          { l:'Status',      v: vesselPct < 100 ? `In Transit — ${vesselPct}%` : 'Arrived' },
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

function LegItem({ color, border, label, pulse, vessel }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ position:'relative', width:14, height:14, flexShrink:0 }}>
        {pulse && (
          <div style={{ position:'absolute', top:-3, left:-3, width:20, height:20,
                        borderRadius:'50%', background:'rgba(211,47,47,0.2)',
                        animation:'pPulse 1.9s infinite' }} />
        )}
        {vessel ? (
          <div style={{ width:14, height:14, borderRadius:'50%', background:'#003087',
                        border:'2px solid #C8A84B', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:8, color:'white', position:'relative', zIndex:1 }}>
            &#9875;
          </div>
        ) : (
          <div style={{ width:14, height:14, borderRadius:'50%', background: color || '#666',
                        border: border ? `2px solid ${border}` : '1px solid rgba(0,0,0,0.12)',
                        position:'relative', zIndex:1 }} />
        )}
      </div>
      <span style={{ fontSize:10, color:'#6b7a9e' }}>{label}</span>
    </div>
  )
}
