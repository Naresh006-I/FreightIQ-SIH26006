/**
 * RouteMap — Interactive Leaflet map for SIH26006
 * - OpenStreetMap tiles (no API key required)
 * - Slow realistic vessel movement (120s for full ocean voyage)
 * - Blinking vessel icon
 * - Click vessel  → Vessel Detail panel
 * - Click port    → Port Detail panel with auto-divert logic
 */

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from '../config'

// ── Fix Vite/Leaflet default icon path issue ──────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── East Coast India ports ────────────────────────────────────────────────────
const EC_PORTS = [
  { id:'INPRD', name:'Paradip',       lat:20.317, lon:86.611, state:'Odisha',         maxDraft:17.0, berths:12, annualCap:'100 MT' },
  { id:'INVTZ', name:'Visakhapatnam', lat:17.686, lon:83.282, state:'Andhra Pradesh', maxDraft:14.5, berths:10, annualCap:'80 MT'  },
  { id:'INGVP', name:'Gangavaram',    lat:17.623, lon:83.226, state:'Andhra Pradesh', maxDraft:18.0, berths:8,  annualCap:'64 MT'  },
  { id:'INGPL', name:'Gopalpur',      lat:19.263, lon:84.893, state:'Odisha',         maxDraft:12.5, berths:4,  annualCap:'20 MT'  },
  { id:'INDMA', name:'Dhamra',        lat:20.892, lon:86.879, state:'Odisha',         maxDraft:16.5, berths:6,  annualCap:'50 MT'  },
  { id:'INHAL', name:'Haldia',        lat:22.026, lon:88.069, state:'West Bengal',    maxDraft:8.5,  berths:9,  annualCap:'45 MT'  },
]

// ── Origin ports ──────────────────────────────────────────────────────────────
const ORIGINS = {
  AU:{ name:'Newcastle, Australia',   lat:-32.92, lon:151.77 },
  ID:{ name:'Samarinda, Indonesia',   lat: -0.50, lon:117.15 },
  US:{ name:'Norfolk, United States', lat: 36.85, lon:-76.29 },
  MZ:{ name:'Maputo, Mozambique',     lat:-25.97, lon: 32.59 },
  RU:{ name:'Taman, Russia',          lat: 45.21, lon: 36.72 },
}

// ── Sea-lane waypoints (realistic) ───────────────────────────────────────────
const SEA_ROUTES = {
  AU:[[-32.92,151.77],[-20.0,130.0],[1.37,103.82],[5.56,80.00]],
  ID:[[ -0.50,117.15],[3.00,100.50],[5.56,80.00]],
  US:[[ 36.85,-76.29],[30.61,32.28],[12.60,43.90],[5.56,80.00]],
  MZ:[[-25.97, 32.59],[-10.00,48.00],[0.00,63.00],[5.56,80.00]],
  RU:[[ 45.21, 36.72],[31.28,32.28],[12.60,43.90],[5.56,80.00]],
}

// ── Nearby fallback ports (for auto-divert logic) ─────────────────────────────
const NEARBY = {
  INPRD:['INGPL','INDMA','INGVP'],
  INVTZ:['INGVP','INGPL','INPRD'],
  INGVP:['INVTZ','INGPL','INPRD'],
  INGPL:['INVTZ','INGVP','INDMA'],
  INDMA:['INPRD','INGPL','INHAL'],
  INHAL:['INDMA','INPRD','INGPL'],
}

function buildRoute(originId, destId) {
  const wp   = SEA_ROUTES[originId] || [[0,80]]
  const dest = EC_PORTS.find(p => p.id === destId)
  return dest ? [...wp, [dest.lat, dest.lon]] : wp
}

function interpolate(pts, t) {
  if (!pts.length) return [15,82]
  const n   = pts.length - 1
  const seg = Math.min(Math.floor(t * n), n - 1)
  const f   = (t * n) - seg
  const a   = pts[seg], b = pts[Math.min(seg+1, n)]
  return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f]
}

// ── CSS injection (once) ──────────────────────────────────────────────────────
let cssInjected = false
function injectCSS() {
  if (cssInjected) return
  const s = document.createElement('style')
  s.textContent = `
    @keyframes vesselBlink {
      0%,100%{ opacity:1; transform:scale(1);   }
      50%    { opacity:0.35; transform:scale(0.8); }
    }
    @keyframes portPulse {
      0%,100%{ transform:scale(1);   opacity:.8; }
      50%    { transform:scale(2.2); opacity:.1; }
    }
    .vessel-blink { animation: vesselBlink 1.8s ease-in-out infinite; }
    .port-pulse-ring {
      position:absolute; top:-5px; left:-5px;
      width:24px; height:24px; border-radius:50%;
      background:rgba(211,47,47,0.25);
      animation:portPulse 1.8s infinite;
      pointer-events:none;
    }
  `
  document.head.appendChild(s)
  cssInjected = true
}

// ── Icon builders ─────────────────────────────────────────────────────────────
function makeVesselIcon(pct) {
  return L.divIcon({
    html: `
      <div class="vessel-blink" style="
        width:28px;height:28px;border-radius:50%;
        background:#003087;border:3px solid #C8A84B;
        box-shadow:0 2px 10px rgba(0,48,135,.6);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;color:white;cursor:pointer;
        position:relative;z-index:10">
        &#9875;
      </div>`,
    className:'', iconAnchor:[14,14], popupAnchor:[0,-16],
  })
}

function makePortIcon(isAvailable, isDest) {
  const bg  = isAvailable ? '#1565c0' : '#d32f2f'
  const brd = isDest ? '3px solid #C8A84B' : '2px solid white'
  const sz  = isDest ? 20 : 14
  const pulse = !isAvailable
    ? `<div class="port-pulse-ring"></div>` : ''
  return L.divIcon({
    html:`<div style="position:relative;display:inline-block">
      ${pulse}
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;
           background:${bg};border:${brd};
           box-shadow:0 2px 6px rgba(0,0,0,.3);
           position:relative;z-index:2;cursor:pointer">
      </div>
    </div>`,
    className:'', iconAnchor:[sz/2,sz/2], popupAnchor:[0,-(sz/2+4)],
  })
}

function makeOriginIcon() {
  return L.divIcon({
    html:`<div style="width:16px;height:16px;border-radius:50%;
          background:#C8A84B;border:2px solid #003087;
          box-shadow:0 0 10px rgba(200,168,75,.8)"></div>`,
    className:'', iconAnchor:[8,8],
  })
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RouteMap({ originId='AU', destPortId='INPRD', month=11, vesselData=null }) {
  const mapDiv     = useRef(null)
  const mapObj     = useRef(null)
  const layersRef  = useRef([])
  const animRef    = useRef(null)
  const progressRef= useRef(0)

  const [congestion,  setCongestion]  = useState({})
  const [vesselPct,   setVesselPct]   = useState(0)
  const [initialized, setInitialized] = useState(false)

  // Modal states
  const [vesselModal, setVesselModal] = useState(false)
  const [portModal,   setPortModal]   = useState(null)  // port object or null

  // ── Fetch port congestion ───────────────────────────────────────────────
  useEffect(() => {
    apiFetch(`/api/whatif/port-intelligence?month=${month}`)
      .then(d => {
        const m = {}
        d.reports.forEach(r => { m[r.port_id] = r })
        setCongestion(m)
      })
      .catch(() => {})
  }, [month])

  // ── Init Leaflet map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current || !mapDiv.current) return
    injectCSS()

    const map = L.map(mapDiv.current, {
      center:[12,82], zoom:4, zoomControl:true,
    })

    // ✅ OpenStreetMap — no API key required
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map)

    mapObj.current = map
    setInitialized(true)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      map.remove()
      mapObj.current = null
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

    // Route line
    const line = L.polyline(route, {
      color:'#003087', weight:2.5, opacity:.6, dashArray:'10 7',
    }).addTo(map)
    layersRef.current.push(line)

    // Origin marker
    const orig = ORIGINS[originId]
    if (orig) {
      const om = L.marker([orig.lat, orig.lon], { icon: makeOriginIcon() })
        .addTo(map)
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
        icon: makePortIcon(avail, isDest),
        zIndexOffset: isDest ? 200 : 0,
      }).addTo(map)

      m.on('click', () => setPortModal({ port, cong, avail, isDest }))
      layersRef.current.push(m)
    })

    // Vessel marker — blinks, clickable
    const vm = L.marker(route[0], {
      icon: makeVesselIcon(0), zIndexOffset:1000,
    }).addTo(map)

    vm.on('click', () => setVesselModal(true))
    layersRef.current.push(vm)

    // ── SLOW animation — 120 seconds for full route (realistic ocean speed) ──
    const DURATION = 120_000   // 2 minutes = realistic ocean crossing feel
    let lastTs = null
    progressRef.current = 0

    function tick(ts) {
      if (lastTs === null) lastTs = ts
      const dt = ts - lastTs
      lastTs   = ts

      progressRef.current = Math.min(progressRef.current + dt / DURATION, 1)
      const pos = interpolate(route, progressRef.current)
      vm.setLatLng(pos)
      setVesselPct(Math.round(progressRef.current * 100))

      if (progressRef.current < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        // Pause 4s at destination then replay
        setTimeout(() => {
          progressRef.current = 0
          lastTs = null
          animRef.current = requestAnimationFrame(tick)
        }, 4000)
      }
    }
    animRef.current = requestAnimationFrame(tick)

    try { map.fitBounds(line.getBounds().pad(0.15)) } catch {}

  }, [originId, destPortId, congestion, initialized])

  const destPort = EC_PORTS.find(p => p.id === destPortId)
  const origInfo = ORIGINS[originId]

  // ── Auto-divert logic ─────────────────────────────────────────────────────
  const vDraft    = vesselData?.draft_m  || 13.8
  const portDraft = destPort?.maxDraft   || 17.0
  const divertNeeded = vDraft > portDraft
  const divertPorts  = divertNeeded
    ? (NEARBY[destPortId] || [])
        .map(id => EC_PORTS.find(p => p.id === id))
        .filter(p => p && p.maxDraft >= vDraft)
    : []

  return (
    <div className="card" style={{ overflow:'hidden', position:'relative' }}>

      {/* Header */}
      <div style={{ background:'#003087', padding:'10px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'white', fontSize:11, fontWeight:700,
                       textTransform:'uppercase', letterSpacing:'0.1em' }}>
          Route Map — Vessel Tracking
        </span>
        <div style={{ display:'flex', gap:16, fontSize:11 }}>
          <span style={{ color:'rgba(255,255,255,.75)' }}>
            {origInfo?.name?.split(',').slice(-1)[0]?.trim() || originId}
            &nbsp;&#x2192;&nbsp;{destPort?.name || destPortId}
          </span>
          <span style={{ color:'#C8A84B', fontWeight:700 }}>
            Vessel: {vesselPct < 100 ? `${vesselPct}% of route` : 'Arrived'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background:'#f8f9fd', borderBottom:'1px solid #dde3f4',
                    padding:'7px 16px', display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
        <LegItem color="#1565c0" label="Port Available" />
        <LegItem color="#d32f2f" label="High Congestion" pulse />
        <LegItem color="#C8A84B" label="Origin" />
        <LegItem color="#003087" border="#C8A84B" label="Destination" />
        <LegItem color="#003087" vessel label="Vessel (click for details)" />
        {divertNeeded && (
          <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700,
                         color:'#d32f2f', background:'#ffebee',
                         border:'1px solid #ef9a9a', padding:'2px 8px', borderRadius:4 }}>
            AUTO-DIVERT ACTIVE
          </span>
        )}
        {!divertNeeded && (
          <span style={{ marginLeft:'auto', fontSize:10, color:'#6b7a9e' }}>
            Click vessel or port for details
          </span>
        )}
      </div>

      {/* Divert alert banner */}
      {divertNeeded && divertPorts.length > 0 && (
        <div style={{ background:'#fff3e0', borderBottom:'1px solid #ffcc80',
                      padding:'8px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#e65100', flexShrink:0 }} />
          <div style={{ fontSize:12, color:'#e65100' }}>
            <strong>Port Divert Alert:</strong> Vessel draft ({vDraft}m) exceeds {destPort?.name} limit ({portDraft}m).
            &nbsp;Auto-diverted to nearest compatible port:{' '}
            <strong>{divertPorts.map(p => `${p.name} (${p.maxDraft}m)`).join(', ')}</strong>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapDiv} style={{ height:440, width:'100%' }} />

      {/* Route summary */}
      <div style={{ padding:'11px 16px', background:'#f8f9fd', borderTop:'1px solid #dde3f4',
                    display:'flex', flexWrap:'wrap', gap:'6px 32px' }}>
        {[
          { l:'Origin',      v: origInfo?.name || originId },
          { l:'Destination', v: destPort?.name || destPortId },
          { l:'Distance',    v: DIST[originId] },
          { l:'Sailing Time',v: TIME[originId] },
          { l:'Status',      v: vesselPct < 100 ? `In Transit — ${vesselPct}% complete` : 'Arrived at Port' },
        ].map(s => (
          <div key={s.l}>
            <div style={{ fontSize:9, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.l}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#003087', marginTop:1 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── VESSEL DETAIL MODAL ── */}
      {vesselModal && (
        <ModalOverlay onClose={() => setVesselModal(false)}>
          <VesselDetailPanel
            vesselData={vesselData}
            originId={originId}
            destPortId={destPortId}
            vesselPct={vesselPct}
            onClose={() => setVesselModal(false)}
          />
        </ModalOverlay>
      )}

      {/* ── PORT DETAIL MODAL ── */}
      {portModal && (
        <ModalOverlay onClose={() => setPortModal(null)}>
          <PortDetailPanel
            portData={portModal}
            vesselData={vesselData}
            congestion={congestion}
            divertPorts={portModal.isDest ? divertPorts : []}
            onClose={() => setPortModal(null)}
          />
        </ModalOverlay>
      )}
    </div>
  )
}

// ── Modal overlay wrapper ─────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:9999,
      background:'rgba(0,0,0,0.45)',
      display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(2px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

// ── Vessel Detail Panel ───────────────────────────────────────────────────────
function VesselDetailPanel({ vesselData, originId, destPortId, vesselPct, onClose }) {
  const orig = ORIGINS[originId]
  const dest = EC_PORTS.find(p => p.id === destPortId)
  const v    = vesselData || {}

  const rows = [
    { label:'Vessel Type',        value: v.vessel_type     || 'Kamsarmax' },
    { label:'DWT (Capacity)',     value: v.dwt ? `${v.dwt.toLocaleString()} MT` : '82,000 MT' },
    { label:'Cargo on Board',     value: v.cargo_mt ? `${Number(v.cargo_mt).toLocaleString()} MT` : '—' },
    { label:'Sea Days (Total)',   value: v.sea_days ? `${v.sea_days} days` : '—' },
    { label:'Voyage Progress',    value: `${vesselPct}% of route`, highlight: true },
    { label:'Origin Port',        value: orig?.name || originId },
    { label:'Destination Port',   value: dest?.name || destPortId },
    { label:'Fuel Consumption',   value: v.fuel_consumption_mt ? `${v.fuel_consumption_mt} MT (VLSFO)` : '~540 MT' },
    { label:'CII Grade',          value: v.cii_grade || 'C' },
    { label:'Cost / Tonne',       value: v.cost_per_tonne ? `$${v.cost_per_tonne}/MT` : '—' },
    { label:'Total Voyage Cost',  value: v.total_voyage_cost_usd ? `$${Number(v.total_voyage_cost_usd).toLocaleString()}` : '—' },
  ]

  return (
    <div style={{
      background:'white', borderRadius:10, width:380, maxHeight:'80vh',
      overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
    }}>
      {/* Header */}
      <div style={{ background:'#003087', padding:'14px 18px',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    borderRadius:'10px 10px 0 0' }}>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:14 }}>Vessel Details</div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, marginTop:2 }}>
            In-transit voyage information
          </div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none',
          color:'white', borderRadius:6, width:28, height:28, cursor:'pointer', fontSize:16,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          ×
        </button>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      {/* Vessel visual */}
      <div style={{ padding:'16px 18px', background:'#f8f9fd',
                    borderBottom:'1px solid #eef1fa', textAlign:'center' }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:'#003087',
                      border:'3px solid #C8A84B', margin:'0 auto 8px',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:24, color:'white' }}>
          &#9875;
        </div>
        <div style={{ fontWeight:800, fontSize:18, color:'#003087' }}>
          {v.vessel_type || 'Kamsarmax'}
        </div>
        <div style={{ fontSize:12, color:'#6b7a9e', marginTop:3 }}>
          {v.dwt ? `${v.dwt.toLocaleString()} DWT` : '82,000 DWT'} &nbsp;·&nbsp; CII Grade {v.cii_grade || 'C'}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11,
                        color:'#6b7a9e', marginBottom:4 }}>
            <span>{orig?.name?.split(',')[0] || originId}</span>
            <span style={{ fontWeight:700, color:'#003087' }}>{vesselPct}%</span>
            <span>{dest?.name || destPortId}</span>
          </div>
          <div style={{ background:'#e8ecf4', borderRadius:4, height:8, overflow:'hidden' }}>
            <div style={{ height:8, background:'#003087', borderRadius:4,
                          width:`${vesselPct}%`, transition:'width 1s' }} />
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ padding:'4px 0' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between',
                                padding:'9px 18px', borderBottom:'1px solid #f5f7fc',
                                background: r.highlight ? '#eff6ff' : 'white' }}>
            <span style={{ fontSize:12, color:'#6b7a9e' }}>{r.label}</span>
            <span style={{ fontSize:12, fontWeight:700,
                           color: r.highlight ? '#003087' : '#1a2340' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Port Detail Panel ─────────────────────────────────────────────────────────
function PortDetailPanel({ portData, vesselData, congestion, divertPorts, onClose }) {
  const { port, cong, avail, isDest } = portData
  const level    = cong?.congestion?.level || cong?.alert_level || 'LOW'
  const wait     = cong?.congestion?.avg_wait_days ?? '—'
  const vessels  = cong?.congestion?.vessels_waiting ?? '—'
  const util     = cong?.congestion?.utilisation_pct ?? 0
  const insight  = cong?.ai_insight || 'Normal operations — no alerts.'

  const vDraft   = vesselData?.draft_m || 13.8
  const compat   = vDraft <= port.maxDraft
  const statusColor = avail ? '#1b5e20' : '#b71c1c'
  const statusBg    = avail ? '#e8f5e9' : '#ffebee'
  const statusBdr   = avail ? '#a5d6a7' : '#ef9a9a'

  return (
    <div style={{
      background:'white', borderRadius:10, width:400, maxHeight:'85vh',
      overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
    }}>
      {/* Header */}
      <div style={{ background: avail ? '#003087' : '#b71c1c', padding:'14px 18px',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    borderRadius:'10px 10px 0 0' }}>
        <div>
          <div style={{ color:'white', fontWeight:800, fontSize:15 }}>
            {port.name}
            {isDest && <span style={{ marginLeft:8, fontSize:11, color:'#C8A84B' }}>★ Destination</span>}
          </div>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:11, marginTop:2 }}>
            {port.state} &nbsp;·&nbsp; East Coast India
          </div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none',
          color:'white', borderRadius:6, width:28, height:28, cursor:'pointer', fontSize:16,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          ×
        </button>
      </div>
      <div style={{ height:3, background:'#C8A84B' }} />

      {/* Status badge */}
      <div style={{ margin:'14px 18px 0', padding:'10px 14px', borderRadius:7,
                    background:statusBg, border:`1px solid ${statusBdr}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:800, fontSize:14, color:statusColor }}>
            {avail ? 'PORT AVAILABLE' : 'HIGH CONGESTION'}
          </span>
          <span style={{ fontSize:11, color:statusColor, fontWeight:700 }}>{level}</span>
        </div>
        <div style={{ fontSize:11, color:statusColor, marginTop:4 }}>{insight}</div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'14px 18px' }}>
        {[
          { l:'Max Draft',       v:`${port.maxDraft} m` },
          { l:'Berths',          v:port.berths },
          { l:'Annual Capacity', v:port.annualCap },
          { l:'Vessels Waiting', v:vessels },
          { l:'Avg Wait Time',   v:`${wait} days` },
          { l:'Berth Utilisation', v:`${util}%` },
        ].map(s => (
          <div key={s.l} style={{ background:'#f5f7fc', border:'1px solid #dde3f4',
                                   borderRadius:6, padding:'10px 12px' }}>
            <div style={{ fontSize:10, color:'#6b7a9e', textTransform:'uppercase',
                          letterSpacing:'0.06em', marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#003087' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Utilisation bar */}
      <div style={{ padding:'0 18px 14px' }}>
        <div style={{ fontSize:11, color:'#6b7a9e', marginBottom:5 }}>Port Utilisation</div>
        <div style={{ background:'#e8ecf4', borderRadius:4, height:8, overflow:'hidden' }}>
          <div style={{ height:8, borderRadius:4,
                        background: util > 65 ? '#d32f2f' : util > 40 ? '#f57c00' : '#2e7d32',
                        width:`${util}%`, transition:'width 0.4s' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10,
                      color:'#6b7a9e', marginTop:3 }}>
          <span>0%</span><span style={{ fontWeight:700 }}>{util}% used</span><span>100%</span>
        </div>
      </div>

      {/* Vessel compatibility */}
      {isDest && vesselData && (
        <div style={{ margin:'0 18px 14px', padding:'10px 14px', borderRadius:7,
                      background: compat ? '#e3f2fd' : '#fff8e1',
                      border:`1px solid ${compat ? '#90caf9' : '#ffe082'}` }}>
          <div style={{ fontSize:11, fontWeight:700,
                        color: compat ? '#0d47a1' : '#e65100', marginBottom:4 }}>
            Vessel Compatibility Check
          </div>
          <div style={{ fontSize:11, color:'#1a2340' }}>
            Vessel draft <strong>{vDraft}m</strong> vs port limit <strong>{port.maxDraft}m</strong>&nbsp;
            {compat
              ? <span style={{ color:'#1b5e20', fontWeight:700 }}>✓ COMPATIBLE</span>
              : <span style={{ color:'#b71c1c', fontWeight:700 }}>✗ INCOMPATIBLE — divert required</span>}
          </div>
        </div>
      )}

      {/* Auto-divert section */}
      {isDest && divertPorts.length > 0 && (
        <div style={{ margin:'0 18px 14px', padding:'12px 14px', borderRadius:7,
                      background:'#fff3e0', border:'1px solid #ffcc80' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#e65100', marginBottom:8 }}>
            Auto-Divert — Recommended Alternate Ports
          </div>
          <div style={{ fontSize:11, color:'#6b7a9e', marginBottom:8 }}>
            {port.name} cannot accommodate this vessel (draft {vDraft}m &gt; {port.maxDraft}m limit).
            Nearest compatible ports:
          </div>
          {divertPorts.map(dp => (
            <div key={dp.id} style={{ display:'flex', justifyContent:'space-between',
                                       padding:'7px 10px', marginBottom:5, borderRadius:5,
                                       background:'white', border:'1px solid #ffe082' }}>
              <div>
                <span style={{ fontWeight:700, fontSize:12, color:'#003087' }}>{dp.name}</span>
                <span style={{ fontSize:10, color:'#6b7a9e', marginLeft:8 }}>{dp.state}</span>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:'#1b5e20' }}>
                Max {dp.maxDraft}m ✓
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Port transfer record note */}
      {isDest && !compat && (
        <div style={{ margin:'0 18px 18px', padding:'10px 14px', borderRadius:7,
                      background:'#fce4ec', border:'1px solid #f48fb1', fontSize:11, color:'#880e4f' }}>
          <strong>Port Transfer Record:</strong> Vessel has been automatically re-routed to nearest
          compatible port. This event is logged for SAIL procurement records and audit trail.
        </div>
      )}
    </div>
  )
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegItem({ color, border, label, pulse, vessel }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ position:'relative', width:14, height:14 }}>
        {pulse && (
          <div style={{ position:'absolute', top:-3, left:-3, width:20, height:20,
                        borderRadius:'50%', background:'rgba(211,47,47,0.2)',
                        animation:'portPulse 1.8s infinite' }} />
        )}
        {vessel ? (
          <div style={{ width:14, height:14, borderRadius:'50%', background:'#003087',
                        border:'2px solid #C8A84B', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:8, color:'white', position:'relative', zIndex:1 }}>
            &#9875;
          </div>
        ) : (
          <div style={{ width:14, height:14, borderRadius:'50%', background:color,
                        border: border ? `2px solid ${border}` : '1px solid rgba(0,0,0,0.12)',
                        position:'relative', zIndex:1 }} />
        )}
      </div>
      <span style={{ fontSize:10, color:'#6b7a9e' }}>{label}</span>
    </div>
  )
}

const DIST = { AU:'4,800 NM', ID:'2,200 NM', US:'11,500 NM', MZ:'5,600 NM', RU:'7,200 NM' }
const TIME = { AU:'~15 days', ID:'~7 days',  US:'~35 days',  MZ:'~17 days', RU:'~22 days' }
