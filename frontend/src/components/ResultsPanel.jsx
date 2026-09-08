import ForecastCard   from './cards/ForecastCard'
import SignalCard     from './cards/SignalCard'
import VesselCard     from './cards/VesselCard'
import PortCard       from './cards/PortCard'
import ContractCard   from './cards/ContractCard'
import RiskCard       from './cards/RiskCard'
import SavingsCard    from './cards/SavingsCard'
import SummaryBanner  from './cards/SummaryBanner'

export default function ResultsPanel({ result }) {
  const {
    input_summary, freight_forecast, market_signal,
    vessel_recommendation, port_compatibility,
    contract_recommendation, risk_assessment,
    savings_opportunity, seasonal_context, economic_snapshot,
  } = result

  return (
    <div className="space-y-5">
      <SummaryBanner input={input_summary} signal={market_signal} seasonal={seasonal_context} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ForecastCard data={freight_forecast}           input={input_summary} />
        <SignalCard   data={market_signal} />
        <VesselCard   data={vessel_recommendation} />
        <PortCard     data={port_compatibility} />
        <ContractCard data={contract_recommendation} />
        <RiskCard     data={risk_assessment} />
      </div>

      <SavingsCard data={savings_opportunity} usdInr={economic_snapshot.usd_inr} />
      <EconFooter econ={economic_snapshot} />
    </div>
  )
}

function EconFooter({ econ }) {
  const items = [
    { l:'USD/INR',      v: econ.usd_inr },
    { l:'IIP Growth',   v:`${econ.iip_growth_pct}%` },
    { l:'GDP Growth',   v:`${econ.gdp_growth_pct}%` },
    { l:'Steel Output', v:`${econ.india_steel_output_mt_month}M MT/mo` },
    { l:'Coal Demand',  v:`${econ.global_coal_demand_index} idx` },
  ]
  return (
    <div className="sail-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-sail-gray" />
        <p className="text-[10px] font-bold text-sail-muted uppercase tracking-widest px-2">
          Economic Indicators — Government of India
        </p>
        <div className="h-px flex-1 bg-sail-gray" />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map(i => (
          <div key={i.l} className="text-[12px]">
            <span className="text-sail-muted">{i.l}: </span>
            <span className="text-sail-navy font-semibold">{i.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
