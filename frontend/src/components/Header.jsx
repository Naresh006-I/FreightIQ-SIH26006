// SAIL-styled header: top info bar + navy navbar with SAIL logo
export default function Header({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'analyze',   icon: '⚡', label: 'Freight Analysis' },
    { id: 'whatif',    icon: '🔬', label: 'What-If Studio'   },
    { id: 'portintel', icon: '🛰️', label: 'Port Intelligence' },
  ]

  return (
    <header className="w-full sticky top-0 z-50 shadow-md">

      {/* ── Top info bar (white) ── */}
      <div className="sail-topbar bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Logo + Org name */}
          <div className="flex items-center gap-4">
            {/* SAIL SVG Logo */}
            <SailLogo />
            <div className="border-l border-gray-300 pl-4">
              <p className="font-bold text-[13px] text-sail-navy leading-tight">
                Steel Authority of India Limited (SAIL)
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">
                A Public Sector Undertaking under the Ministry of Steel, Government of India
              </p>
            </div>
          </div>
          {/* Right badges */}
          <div className="hidden md:flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 sail-pulse inline-block" />
              System Online
            </span>
            <span className="text-[11px] bg-sail-navy text-white px-3 py-1 rounded font-semibold">
              SIH 2026 · Problem SIH26006
            </span>
          </div>
        </div>
      </div>

      {/* ── Navy navbar ── */}
      <div className="sail-navbar">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">

            {/* Platform title */}
            <div className="py-3 pr-8 border-r border-blue-800">
              <p className="font-heading font-bold text-white text-[15px] tracking-wide leading-none">
                FREIGHT INTELLIGENCE PLATFORM
              </p>
              <p className="text-blue-300 text-[11px] mt-0.5 tracking-wider">
                MINISTRY OF STEEL · BULK CARGO PROCUREMENT
              </p>
            </div>

            {/* Nav tabs */}
            <nav className="flex items-stretch h-full gap-0">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-[13px] font-semibold transition-all border-b-[3px] ${
                    activeTab === t.id
                      ? 'text-white border-sail-gold bg-white/10'
                      : 'text-blue-200 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </nav>

            {/* Right info */}
            <div className="hidden lg:block text-right py-3 pl-6 border-l border-blue-800">
              <p className="text-blue-200 text-[11px]">East Coast Ports · 5 Origins</p>
              <p className="text-white text-[11px] font-semibold">Paradip · Vizag · Gangavaram · Dhamra · Haldia</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gold accent line ── */}
      <div className="h-[3px] bg-gradient-to-r from-sail-gold via-sail-gold-light to-sail-gold" />
    </header>
  )
}

/* SAIL Logo SVG — triangle + सेल SAIL text */
function SailLogo() {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <svg width="52" height="56" viewBox="0 0 52 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer navy square */}
        <rect width="52" height="56" rx="3" fill="#003087"/>
        {/* Gold triangle */}
        <polygon points="26,6 46,42 6,42" fill="#C8A84B"/>
        {/* Inner navy triangle */}
        <polygon points="26,14 39,38 13,38" fill="#003087"/>
        {/* Small gold diamond center */}
        <polygon points="26,22 30,30 26,34 22,30" fill="#C8A84B"/>
        {/* सेल text */}
        <text x="26" y="51" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="Arial">सेल SAIL</text>
      </svg>
      {/* Great Place to Work badge style */}
      <div className="hidden sm:flex flex-col items-center bg-red-700 rounded px-1.5 py-1 text-white">
        <span style={{fontSize:'6px'}} className="font-bold leading-none">GREAT</span>
        <span style={{fontSize:'6px'}} className="font-bold leading-none">PLACE</span>
        <span style={{fontSize:'6px'}} className="font-bold leading-none">TO</span>
        <span style={{fontSize:'6px'}} className="font-bold leading-none">WORK</span>
        <span style={{fontSize:'5px'}} className="leading-none mt-0.5 text-yellow-300">CERTIFIED</span>
      </div>
    </div>
  )
}
