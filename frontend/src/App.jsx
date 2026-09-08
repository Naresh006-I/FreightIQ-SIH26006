import { useState } from 'react'
import Header           from './components/Header'
import InputForm        from './components/InputForm'
import ResultsPanel     from './components/ResultsPanel'
import WhatIfStudio     from './components/WhatIfStudio'
import PortIntelligence from './components/PortIntelligence'
import SailHero         from './components/SailHero'
import { apiFetch }     from './config'

const DEFAULT_FORM = {
  commodity: 'thermal_coal', quantity_mt: 80000,
  origin_id: 'AU', port_id: 'INPRD',
  target_month: 11, target_year: 2026, contract_months: 6,
}

export default function App() {
  const [tab,     setTab]     = useState('analyze')
  const [form,    setForm]    = useState(DEFAULT_FORM)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleAnalyze(formData) {
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await apiFetch('/api/analyze', { method:'POST', body: JSON.stringify(formData) }))
    } catch (e) {
      setError(e.message || 'Failed to connect. Ensure backend is running on port 8000.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f8' }}>
      <Header activeTab={tab} onTabChange={t => { setTab(t) }} />

      <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 16px' }}>

        {/* ── Freight Analysis ── */}
        {tab === 'analyze' && (
          <>
            <SailHero
              title="Freight Analysis"
              subtitle="AI-powered freight forecasting · vessel selection · contract optimization for bulk cargo procurement"
              badge="SAIL · Ministry of Steel"
            />
            <div style={{ display:'grid', gridTemplateColumns:'clamp(320px,30%,400px) 1fr', gap:24, alignItems:'start' }}>
              <div style={{ position:'sticky', top:88 }}>
                <InputForm form={form} onChange={setForm} onSubmit={handleAnalyze} loading={loading} />
              </div>
              <div>
                {error   && <ErrorBanner msg={error} />}
                {loading && <LoadingCard />}
                {result  && !loading && <ResultsPanel result={result} />}
                {!result && !loading && !error && <WelcomeCard />}
              </div>
            </div>
          </>
        )}

        {tab === 'whatif' && (
          <>
            <SailHero
              title="What-If Simulation Studio"
              subtitle="Simulate disruption scenarios — terminal delays, route capacity cuts, demand spikes — and see the cost impact vs your baseline plan"
              badge="Scenario Analysis"
            />
            <WhatIfStudio defaultForm={form} />
          </>
        )}

        {tab === 'portintel' && (
          <>
            <SailHero
              title="Port Intelligence"
              subtitle="AI-powered congestion analysis, weather risk assessment, and smart port switching across all East Coast India procurement ports"
              badge="Port Analytics"
            />
            <PortIntelligence defaultMonth={form.target_month} />
          </>
        )}
      </main>
    </div>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ background:'#fff0f0', border:'1px solid #f5a0a0', borderRadius:8, padding:'14px 18px',
                  color:'#b71c1c', fontSize:13, marginBottom:16 }}>
      ⚠ {msg}
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="card" style={{ padding:'60px 20px', textAlign:'center' }}>
      <div style={{ width:44, height:44, border:'4px solid #dde3f4', borderTopColor:'#003087',
                    borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
      <p style={{ color:'#6b7a9e', fontSize:14 }}>Running AI analysis across all engines…</p>
      <p style={{ color:'#b0bbd4', fontSize:12, marginTop:6 }}>Freight forecast · Vessel selection · Risk assessment</p>
    </div>
  )
}

function WelcomeCard() {
  return (
    <div className="card" style={{ padding:'56px 32px', textAlign:'center' }}>
      {/* SAIL logo mark */}
      <div style={{ width:64, height:64, background:'#003087', borderRadius:10,
                    display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <svg width="38" height="38" viewBox="0 0 38 38">
          <polygon points="19,3 35,33 3,33" fill="#C8A84B" />
          <polygon points="19,10 29,29 9,29"  fill="#003087" />
          <circle cx="19" cy="22" r="4" fill="#C8A84B" />
        </svg>
      </div>
      <h3 style={{ fontSize:18, fontWeight:700, color:'#003087', marginBottom:8 }}>
        SAIL Freight Intelligence Platform
      </h3>
      <p style={{ color:'#6b7a9e', fontSize:13, lineHeight:1.7, maxWidth:440, margin:'0 auto 20px' }}>
        Enter your shipment parameters on the left and click <strong style={{color:'#003087'}}>Run Analysis</strong> to
        receive AI-powered freight forecasts, vessel recommendations, port compatibility checks, and cost savings.
      </p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
        {['Freight Forecast','Market Signal','Vessel Optimizer','Port Check','Contract Advice','Risk Assessment','Savings Calculator'].map(f => (
          <span key={f} style={{ background:'#eef1fb', border:'1px solid #dde3f4', color:'#6b7a9e',
                                   fontSize:11, padding:'4px 10px', borderRadius:20 }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
