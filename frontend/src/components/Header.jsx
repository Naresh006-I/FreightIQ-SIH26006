export default function Header() {
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌊</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">FreightIQ</h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Intelligent Freight Forecasting · SIH 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ministry of Steel · Problem SIH26006
          </span>
        </div>
      </div>
    </header>
  )
}
