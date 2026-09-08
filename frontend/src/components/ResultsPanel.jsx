import SummaryBanner from './cards/SummaryBanner'
import ForecastCard  from './cards/ForecastCard'
import SignalCard    from './cards/SignalCard'
import VesselCard    from './cards/VesselCard'
import PortCard      from './cards/PortCard'
import ContractCard  from './cards/ContractCard'
import RiskCard      from './cards/RiskCard'
import SavingsCard   from './cards/SavingsCard'

export default function ResultsPanel({ result }) {
  const {
    input_summary, freight_forecast, market_signal,
    vessel_recommendation, port_compatibility,
    contract_recommendation, risk_assessment,
    savings_opportunity, seasonal_context, economic_snapshot,
  } = result

  return (
    <div>
      <SummaryBanner input={input_summary} signal={market_signal} seasonal={seasonal_context} />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <ForecastCard data={freight_forecast}        input={input_summary} />
        <SignalCard   data={market_signal} />
        <VesselCard   data={vessel_recommendation} />
        <PortCard     data={port_compatibility} />
        <ContractCard data={contract_recommendation} />
        <RiskCard     data={risk_assessment} />
      </div>

      <SavingsCard data={savings_opportunity} usdInr={economic_snapshot.usd_inr} />

      {/* Economic footer */}
      <div className="card" style={{ padding:'14px 20px', marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
          <div style={{ flex:1, height:1, background:'#dde3f4' }} />
          <span style={{ fontSize:10, fontWeight:700, color:'#6b7a9e', textTransform:'uppercase', letterSpacing:'0.1em' }}>
            Economic Indicators — Government of India
          </span>
          <div style={{ flex:1, height:1, background:'#dde3f4' }} />
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 32px' }}>
          {[
            { l:'USD/INR',     v: economic_snapshot.usd_inr },
            { l:'IIP Growth',  v:`${economic_snapshot.iip_growth_pct}%` },
            { l:'GDP Growth',  v:`${economic_snapshot.gdp_growth_pct}%` },
            { l:'Steel Output',v:`${economic_snapshot.india_steel_output_mt_month}M MT/mo` },
            { l:'Coal Demand', v:`${economic_snapshot.global_coal_demand_index} idx` },
          ].map(i => (
            <div key={i.l} style={{ fontSize:12 }}>
              <span style={{ color:'#6b7a9e' }}>{i.l}: </span>
              <span style={{ color:'#003087', fontWeight:700 }}>{i.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
