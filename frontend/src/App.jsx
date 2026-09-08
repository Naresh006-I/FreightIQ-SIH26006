import { useState } from 'react'
import InputForm from './components/InputForm'
import ResultsPanel from './components/ResultsPanel'
import Header from './components/Header'

const DEFAULT_FORM = {
  commodity: 'thermal_coal',
  quantity_mt: 80000,
  origin_id: 'AU',
  port_id: 'INPRD',
  target_month: 11,
  target_year: 2026,
  contract_months: 6,
}

export default function App() {
  const [form, setForm]       = useState(DEFAULT_FORM)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleAnalyze(formData) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
          {/* LEFT — Input Form */}
          <div className="xl:sticky xl:top-6">
            <InputForm
              form={form}
              onChange={setForm}
              onSubmit={handleAnalyze}
              loading={loading}
            />
          </div>

          {/* RIGHT — Results */}
          <div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}
            {loading && <LoadingState />}
            {result && !loading && <ResultsPanel result={result} />}
            {!result && !loading && !error && <EmptyState />}
          </div>
        </div>
      </main>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin" />
      </div>
      <p className="text-slate-400 text-sm">Running AI analysis across all 6 engines…</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="text-6xl">⚓</div>
      <h3 className="text-xl font-semibold text-slate-300">Ready to Analyze</h3>
      <p className="text-slate-500 text-sm max-w-sm">
        Fill in the shipment details on the left and click <strong className="text-sky-400">Run Analysis</strong> to get
        freight forecasts, vessel recommendations, and cost savings.
      </p>
    </div>
  )
}
