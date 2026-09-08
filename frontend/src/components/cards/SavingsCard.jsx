export default function SavingsCard({ data, usdInr }) {
  const {
    total_saving_usd, total_saving_inr,
    per_tonne_usd, per_tonne_inr,
    contract_saving_usd, vessel_opt_saving_usd,
    breakdown_note,
  } = data

  const lakhs = total_saving_inr / 1_00_000

  return (
    <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-800/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💰</span>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Estimated Savings Opportunity</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {/* Hero INR saving */}
        <div className="col-span-2 sm:col-span-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-xs text-emerald-400/70 font-semibold uppercase tracking-wider">Total Saving</p>
          <p className="text-3xl font-black text-emerald-300 mt-1">
            ₹{lakhs.toFixed(1)}<span className="text-lg font-bold"> L</span>
          </p>
          <p className="text-sm text-emerald-400/70 mt-0.5">${total_saving_usd.toLocaleString()} USD</p>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1">Per Tonne</p>
          <p className="text-xl font-bold text-slate-200">₹{per_tonne_inr.toFixed(0)}</p>
          <p className="text-xs text-slate-500">${per_tonne_usd.toFixed(2)}/MT</p>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1">Exchange Rate</p>
          <p className="text-xl font-bold text-slate-200">₹{usdInr.toFixed(2)}</p>
          <p className="text-xs text-slate-500">per USD</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <SavingBar label="Contract Saving" usd={contract_saving_usd} inr={contract_saving_usd * usdInr} color="bg-emerald-500" />
        <SavingBar label="Vessel Optimisation" usd={vessel_opt_saving_usd} inr={vessel_opt_saving_usd * usdInr} color="bg-sky-500" />
      </div>

      <p className="text-xs text-slate-400">{breakdown_note}</p>
    </div>
  )
}

function SavingBar({ label, usd, inr, color }) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-200">${usd.toLocaleString()}</p>
      <p className="text-xs text-slate-500">₹{(inr/1_00_000).toFixed(1)}L</p>
      <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
        <div className={`${color} h-1 rounded-full`} style={{ width: '70%' }} />
      </div>
    </div>
  )
}
