import { useState } from 'react'
import Header       from './components/Header'
import InputForm    from './components/InputForm'
import ResultsPanel from './components/ResultsPanel'
import WhatIfStudio from './components/WhatIfStudio'
import PortIntelligence from './components/PortIntelligence'

const DEFAULT_FORM = {
  commodity: 'thermal_coal', quantity_mt: 80000,
  origin_id: 'AU', port_id: 'INPRD',
  target_month: 11, target_year: 2026, contract_months: 6,
}

export default function App() {
  const [tab, setTab]         = useState('analyze')
  const [form, setForm]       = useState(DEFAULT_FORM)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleAnalyze(formData) {
    setLoading(true); setError(null); setResult(null)
    try {
      const res  = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setError(e.message || 'Failed to connect to backend')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header activeTab={tab} onTabChange={setTab} />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ── ANALYSIS TAB ── */}
        {tab === 'analyze' && (
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
            <div className="xl:sticky xl:top-20">
              <InputForm form={form} onChange={setForm} onSubmit={handleAnalyze} loading={loading} />
            </div>
            <div>
              {error && <ErrBox msg={error} />}
              {loading && <Spinner label="Running AI analysis across all 6 engines…" />}
              {result && !loading && <ResultsPanel result={result} />}
              {!result && !loading && !error && <EmptyState />}
            </div>
          </div>
        )}

        {/* ── WHAT-IF STUDIO TAB ── */}
        {tab === 'whatif' && (
          <WhatIfStudio defaultForm={form} />
        )}

        {/* ── PORT INTELLIGENCE TAB ── */}
        {tab === 'portintel' && (
          <PortIntelligence defaultMonth={form.target_month} />
        )}
      </main>
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-red-400 text-sm">⚠️ {msg}</div>
  )
}

function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin" />
      </div>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="text-6xl">⚓</div>
      <h3 className="text-xl font-semibold text-slate-300">Ready to Analyze</h3>
      <p className="text-slate-500 text-sm max-w-sm">
        Fill in the shipment details and click <strong className="text-sky-400">Run Analysis</strong> to get
        freight forecasts, vessel recommendations, and cost savings.
      </p>
      <p className="text-slate-600 text-xs">
        Switch to <strong className="text-violet-400">What-If Studio</strong> to simulate disruption scenarios or <strong className="text-sky-400">Port Intelligence</strong> for live port analytics.
      </p>
    </div>
  )
}
