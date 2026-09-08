export default function SavingsCard({ data, usdInr }) {
  const { total_saving_usd, total_saving_inr, per_tonne_usd, per_tonne_inr,
          contract_saving_usd, vessel_opt_saving_usd, breakdown_note } = data
  const lakhs = total_saving_inr / 1_00_000

  return (
    <div className="sail-card overflow-hidden">
      {/* Header */}
      <div className="bg-sail-navy px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>💰</span>
          <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">Estimated Savings Opportunity</h3>
        </div>
        <span className="text-sail-gold text-[11px] font-semibold">vs Reactive Spot Procurement</span>
      </div>
      <div className="h-[3px] bg-sail-gold" />

      <div className="p-5 bg-sail-offwhite">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {/* Hero */}
          <div className="col-span-2 bg-sail-navy rounded p-4 text-center">
            <p className="text-blue-300 text-[11px] uppercase tracking-widest mb-1">Total Saving (INR)</p>
            <p className="text-4xl font-black text-white">₹{lakhs.toFixed(1)}<span className="text-xl"> L</span></p>
            <p className="text-blue-300 text-[12px] mt-1">${total_saving_usd.toLocaleString()} USD</p>
          </div>
          <div className="bg-white border border-sail-gray rounded p-3 text-center">
            <p className="text-[10px] text-sail-muted uppercase tracking-wide mb-1">Per Tonne</p>
            <p className="text-xl font-bold text-sail-navy">₹{per_tonne_inr.toFixed(0)}</p>
            <p className="text-[11px] text-sail-muted">${per_tonne_usd.toFixed(2)}/MT</p>
          </div>
          <div className="bg-white border border-sail-gray rounded p-3 text-center">
            <p className="text-[10px] text-sail-muted uppercase tracking-wide mb-1">USD/INR Rate</p>
            <p className="text-xl font-bold text-sail-navy">₹{usdInr.toFixed(2)}</p>
            <p className="text-[11px] text-sail-muted">per USD</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <SavingBar label="Contract Optimisation" usd={contract_saving_usd} inr={contract_saving_usd * usdInr} color="bg-sail-navy" />
          <SavingBar label="Vessel Selection Saving" usd={vessel_opt_saving_usd} inr={vessel_opt_saving_usd * usdInr} color="bg-sail-gold" />
        </div>

        <p className="text-[11px] text-sail-muted">{breakdown_note}</p>
      </div>
    </div>
  )
}

function SavingBar({ label, usd, inr, color }) {
  return (
    <div className="bg-white border border-sail-gray rounded p-3">
      <p className="text-[11px] text-sail-muted mb-1">{label}</p>
      <p className="text-[13px] font-bold text-sail-navy">${usd.toLocaleString()}</p>
      <p className="text-[11px] text-sail-muted">₹{(inr/1_00_000).toFixed(1)}L</p>
      <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{width:'70%'}} />
      </div>
    </div>
  )
}
