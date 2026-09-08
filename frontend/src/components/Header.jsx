export default function Header({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'analyze',  icon: '⚡', label: 'Analysis' },
    { id: 'whatif',   icon: '🔬', label: 'What-If Studio' },
    { id: 'portintel',icon: '🛰️', label: 'Port Intelligence' },
  ]

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
            ND
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-none tracking-tight">NayaDisha</h1>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">Freight Intelligence Platform · SIH 2026</p>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Badge */}
        <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ministry of Steel · SIH26006
        </span>
      </div>
    </header>
  )
}
