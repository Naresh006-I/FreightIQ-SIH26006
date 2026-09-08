function CardHeader({ icon, title }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-sail-navy">
      <span>{icon}</span>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">{title}</h3>
    </div>
  )
}

export default function ContractCard({ data }) {
  const { recommended_type, recommended_rate, recommended_cost_usd, saving_vs_spot_usd, rationale, options } = data
  return (
    <div className="sail-card overflow-hidden">
      <CardHeader icon="📄" title="Contract Recommendation" />
      <div className="p-4">

        {/* Recommended */}
        <div className="bg-sail-navy rounded p-3 mb-4">
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">SAIL Recommended</p>
          <p className="text-xl font-black text-white mt-0.5">{recommended_type}</p>
          <p className="text-blue-200 text-[12px] mt-0.5">
            ${recommended_rate}/MT &nbsp;·&nbsp; Total ${(recommended_cost_usd/1_000_000).toFixed(2)}M
          </p>
        </div>

        {/* Options table */}
        <div className="border border-sail-gray rounded overflow-hidden mb-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-sail-offwhite">
                <th className="text-left px-3 py-2 text-sail-muted font-semibold">Contract Type</th>
                <th className="text-right px-3 py-2 text-sail-muted font-semibold">Rate</th>
                <th className="text-right px-3 py-2 text-sail-muted font-semibold">Discount</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt, i) => {
                const isRec = opt.type === recommended_type
                return (
                  <tr key={i} className={`border-t border-sail-gray ${isRec ? 'bg-blue-50' : ''}`}>
                    <td className={`px-3 py-2 font-medium ${isRec ? 'text-sail-navy font-bold' : 'text-sail-text'}`}>
                      {isRec && <span className="text-sail-gold mr-1">★</span>}
                      {opt.type}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-sail-text">${opt.rate}/MT</td>
                    <td className="px-3 py-2 text-right">
                      {opt.discount_pct > 0
                        ? <span className="text-green-600 font-bold">-{opt.discount_pct}%</span>
                        : <span className="text-sail-muted">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Saving */}
        {saving_vs_spot_usd > 0 && (
          <div className="bg-green-50 border border-green-300 rounded p-2.5 mb-2 flex justify-between items-center">
            <p className="text-[12px] text-green-700 font-semibold">Saving vs Spot Market</p>
            <p className="text-[15px] font-black text-green-700">${saving_vs_spot_usd.toLocaleString()}</p>
          </div>
        )}

        <p className="text-[11px] text-sail-muted leading-relaxed">{rationale}</p>
      </div>
    </div>
  )
}
