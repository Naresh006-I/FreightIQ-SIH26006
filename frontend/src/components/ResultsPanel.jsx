import ForecastCard       from './cards/ForecastCard'
import SignalCard          from './cards/SignalCard'
import VesselCard          from './cards/VesselCard'
import PortCard            from './cards/PortCard'
import ContractCard        from './cards/ContractCard'
import RiskCard            from './cards/RiskCard'
import SavingsCard         from './cards/SavingsCard'
import SummaryBanner       from './cards/SummaryBanner'

export default function ResultsPanel({ result }) {
  const {
    input_summary, freight_forecast, market_signal,
    vessel_recommendation, port_compatibility,
    contract_recommendation, risk_assessment,
    savings_opportunity, seasonal_context, economic_snapshot,
  } = result

  return (
    <div className="space-y-5">
      {/* Top summary banner */}
      <SummaryBanner
        input={input_summary}
        signal={market_signal}
        seasonal={seasonal_context}
      />

      {/* 2-column grid for main cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ForecastCard data={freight_forecast} input={input_summary} />
        <SignalCard   data={market_signal} />
        <VesselCard   data={vessel_recommendation} />
        <PortCard     data={port_compatibility} />
        <ContractCard data={contract_recommendation} />
        <RiskCard     data={risk_assessment} />
      </div>

      {/* Full-width savings */}
      <SavingsCard data={savings_opportunity} usdInr={economic_snapshot.usd_inr} />

      {/* Economic snapshot footer */}
      <EconFooter econ={economic_snapshot} />
    </div>
  )
}

function EconFooter({ econ }) {
  const items = [
    { label: 'USD/INR',     value: econ.usd_inr },
    { label: 'IIP Growth',  value: `${econ.iip_growth_pct}%` },
    { label: 'GDP Growth',  value: `${econ.gdp_growth_pct}%` },
    { label: 'Steel Output',value: `${econ.india_steel_output_mt_month}M MT/mo` },
    { label: 'Coal Demand', value: `${econ.global_coal_demand_index} idx` },
  ]
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Economic Indicators</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map(i => (
          <div key={i.label} className="text-xs">
            <span className="text-slate-500">{i.label}: </span>
            <span className="text-slate-300 font-medium">{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
