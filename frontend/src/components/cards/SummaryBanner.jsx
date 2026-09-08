const COMMODITY_LABELS = {
  thermal_coal:'Thermal Coal', coking_coal:'Coking Coal',
  iron_ore:'Iron Ore', limestone:'Limestone', bauxite:'Bauxite',
}
const ORIGIN_LABELS = { AU:'Australia', ID:'Indonesia', US:'United States', MZ:'Mozambique', RU:'Russia' }
const PORT_LABELS   = { INPRD:'Paradip', INVTZ:'Visakhapatnam', INGVP:'Gangavaram', INGPL:'Gopalpur', INDMA:'Dhamra', INHAL:'Haldia' }

const SIGNAL_CFG = {
  'BUY NOW':  { bg:'bg-green-50 border-green-300',  badge:'bg-green-600',  text:'text-green-800' },
  'WAIT':     { bg:'bg-red-50 border-red-300',      badge:'bg-red-600',    text:'text-red-800'   },
  'CAUTION':  { bg:'bg-yellow-50 border-yellow-300',badge:'bg-yellow-500', text:'text-yellow-800'},
}

export default function SummaryBanner({ input, signal, seasonal }) {
  const cfg = SIGNAL_CFG[signal.signal] || SIGNAL_CFG['CAUTION']
  return (
    <div className={`sail-card border-2 overflow-hidden ${cfg.bg}`}>
      {/* Navy top strip */}
      <div className="bg-sail-navy px-5 py-2 flex items-center justify-between">
        <span className="text-white text-[11px] font-bold uppercase tracking-widest">
          Analysis Summary — SAIL Freight Intelligence
        </span>
        <span className="text-sail-gold text-[11px]">SIH26006</span>
      </div>

      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-sail-navy">
            {input.quantity_mt.toLocaleString()} MT &nbsp;·&nbsp;
            {COMMODITY_LABELS[input.commodity] || input.commodity}
          </h2>
          <p className="text-[13px] text-sail-muted mt-1">
            <span className="font-semibold text-sail-text">{ORIGIN_LABELS[input.origin_id]}</span>
            &nbsp;→&nbsp;
            <span className="font-semibold text-sail-text">{PORT_LABELS[input.port_id]}</span>
            &nbsp;·&nbsp;{input.period}
            &nbsp;·&nbsp;{input.contract_months}-month contract
            &nbsp;·&nbsp;{input.route_distance_nm.toLocaleString()} NM
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {seasonal.peak_demand && (
              <span className="text-[11px] bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 rounded font-semibold">
                📈 Post-Monsoon Demand Peak
              </span>
            )}
            {seasonal.monsoon && (
              <span className="text-[11px] bg-blue-100 text-blue-700 border border-blue-300 px-2 py-0.5 rounded font-semibold">
                🌧️ Monsoon Season Active
              </span>
            )}
          </div>
        </div>

        {/* Signal badge */}
        <div className={`${cfg.badge} rounded px-6 py-3 text-center min-w-[120px]`}>
          <p className="text-white font-black text-lg tracking-wide">{signal.signal}</p>
          <p className="text-white/80 text-[11px] mt-0.5">{signal.confidence}% confidence</p>
        </div>
      </div>
    </div>
  )
}
