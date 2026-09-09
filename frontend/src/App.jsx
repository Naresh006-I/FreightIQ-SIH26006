import { useState } from 'react'
import Header           from './components/Header'
import InputForm        from './components/InputForm'
import ResultsPanel     from './components/ResultsPanel'
import WhatIfStudio     from './components/WhatIfStudio'
import PortIntelligence from './components/PortIntelligence'
import VesselDashboard  from './pages/VesselDashboard'
import PortDashboard    from './pages/PortDashboard'
import { apiFetch }     from './config'

const DEFAULT_FORM = {
  commodity:'thermal_coal', quantity_mt:80000,
  origin_id:'AU', port_id:'INPRD',
  target_month:11, target_year:2026, contract_months:6,
}

export default function App() {
  const [tab,        setTab]        = useState('analyze')
  const [form,       setForm]       = useState(DEFAULT_FORM)
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // Sub-page navigation state
  // subPage: null | { type:'vessel' } | { type:'port', portId:string }
  const [subPage,    setSubPage]    = useState(null)
  const [vesselPct,  setVesselPct]  = useState(0)

  async function handleAnalyze(formData) {
    setLoading(true); setError(null); setResult(null); setSubPage(null)
    try {
      setResult(await apiFetch('/api/analyze', { method:'POST', body:JSON.stringify(formData) }))
    } catch (e) {
      setError(e.message || 'Failed to connect. Ensure backend is running on port 8000.')
    } finally { setLoading(false) }
  }

  // ── If a sub-page is active, render it full-page (replaces main content) ──
  if (subPage?.type === 'vessel' && result) {
    const v = result.vessel_recommendation
    return (
      <VesselDashboard
        vesselData={{ ...v, cargo_mt: form.quantity_mt, draft_m: VESSEL_DRAFTS[v.vessel_type] || 13.8 }}
        originId={form.origin_id}
        destPortId={form.port_id}
        vesselPct={vesselPct}
        onBack={() => setSubPage(null)}
      />
    )
  }

  if (subPage?.type === 'port') {
    const v = result?.vessel_recommendation
    return (
      <PortDashboard
        portId={subPage.portId}
        vesselData={v ? { ...v, cargo_mt: form.quantity_mt, draft_m: VESSEL_DRAFTS[v.vessel_type] || 13.8 } : null}
        month={form.target_month}
        onBack={() => setSubPage(null)}
      />
    )
  }

  // ── Normal layout ──
  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8' }}>
      <Header activeTab={tab} onTabChange={t => { setTab(t); setSubPage(null) }} />

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 16px' }}>

        {/* Page title bar */}
        <div style={{ background:'white', border:'1px solid #dde3f4', borderRadius:8,
                      padding:'14px 20px', marginBottom:24,
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'#003087' }}>
              {tab==='analyze'   && 'Freight Analysis'}
              {tab==='whatif'    && 'What-If Simulation Studio'}
              {tab==='portintel' && 'Port Intelligence'}
            </div>
            <div style={{ fontSize:12, color:'#6b7a9e', marginTop:3 }}>
              {tab==='analyze'   && 'AI-powered freight forecasting, vessel selection and contract optimization'}
              {tab==='whatif'    && 'Simulate disruption scenarios and compute cost impact vs baseline plan'}
              {tab==='portintel' && 'Congestion analysis, weather risk and smart port switching — East Coast India'}
            </div>
          </div>
          <div style={{ fontSize:11, color:'#6b7a9e', background:'#f5f7fc',
                        border:'1px solid #dde3f4', padding:'4px 12px', borderRadius:4 }}>
            SAIL · Ministry of Steel
          </div>
        </div>

        {/* Freight Analysis */}
        {tab === 'analyze' && (
          <div style={{ display:'grid', gridTemplateColumns:'clamp(320px,30%,400px) 1fr',
                        gap:24, alignItems:'start' }}>
            <div style={{ position:'sticky', top:96 }}>
              <InputForm form={form} onChange={setForm} onSubmit={handleAnalyze} loading={loading} />
            </div>
            <div>
              {error   && <ErrorBanner msg={error} />}
              {loading && <LoadingCard />}
              {result  && !loading && (
                <ResultsPanel
                  result={result}
                  onVesselClick={() => setSubPage({ type:'vessel' })}
                  onPortClick={portId => setSubPage({ type:'port', portId })}
                  onVesselPctChange={setVesselPct}
                />
              )}
              {!result && !loading && !error && <WelcomeCard />}
            </div>
          </div>
        )}

        {tab === 'whatif'    && <WhatIfStudio     defaultForm={form} />}
        {tab === 'portintel' && <PortIntelligence defaultMonth={form.target_month} />}
      </main>
    </div>
  )
}

// Draft lookup matching datasets.py VESSELS
const VESSEL_DRAFTS = {
  Handymax:11.5, Supramax:12.5, Ultramax:12.8,
  Panamax:13.5, Kamsarmax:13.8, Capesize:18.2,
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ background:'#fff0f0', border:'1px solid #f5a0a0', borderRadius:8,
                  padding:'14px 18px', color:'#b71c1c', fontSize:13, marginBottom:16 }}>
      {msg}
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="card" style={{ padding:'60px 20px', textAlign:'center' }}>
      <div style={{ width:40, height:40, border:'4px solid #dde3f4', borderTopColor:'#003087',
                    borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
      <p style={{ color:'#6b7a9e', fontSize:14, margin:0 }}>Running analysis across all AI engines…</p>
      <p style={{ color:'#b0bbd4', fontSize:12, marginTop:6 }}>Freight forecast · Vessel selection · Risk assessment</p>
    </div>
  )
}

function WelcomeCard() {
  return (
    <div className="card" style={{ padding:'48px 32px', textAlign:'center' }}>
      <div style={{ width:56, height:56, background:'#003087', borderRadius:8,
                    display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="4" width="24" height="24" rx="1" fill="#C8A84B" transform="rotate(45 16 16)" />
          <rect x="8" y="8" width="16" height="16" rx="1" fill="#003087" transform="rotate(45 16 16)" />
          <polyline points="10,20 16,12 22,20" fill="none" stroke="white" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 style={{ fontSize:17, fontWeight:700, color:'#003087', marginBottom:8 }}>
        SAIL Freight Intelligence Platform
      </h3>
      <p style={{ color:'#6b7a9e', fontSize:13, lineHeight:1.7, maxWidth:420, margin:'0 auto 20px' }}>
        Enter shipment parameters on the left — or upload a CSV / Excel file — then click{' '}
        <strong style={{ color:'#003087' }}>Run Analysis</strong> to receive AI-powered
        freight forecasts, vessel recommendations, and cost savings.
      </p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
        {['Freight Forecast','Market Signal','Vessel Optimizer',
          'Port Compatibility','Contract Advice','Risk Assessment','Savings Calculator'].map(f => (
          <span key={f} style={{ background:'#f0f3fb', border:'1px solid #dde3f4', color:'#6b7a9e',
                                  fontSize:11, padding:'4px 10px', borderRadius:4 }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
