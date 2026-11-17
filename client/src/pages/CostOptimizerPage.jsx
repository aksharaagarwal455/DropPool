import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { Api, errorMessage } from '../lib/api'
import { formatPaise } from '../lib/money'

export default function CostOptimizerPage() {
  const [searchParams] = useSearchParams()
  const poolId = searchParams.get('pool')
  const intentId = searchParams.get('intent')
  const { meta } = useAuth()

  const [allocation, setAllocation] = useState('proportional') // 'proportional' | 'equal'
  const [optimization, setOptimization] = useState(null)
  const [poolContext, setPoolContext] = useState(null)
  const [intentIds, setIntentIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch optimization source
  const loadOptimization = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (poolId) {
        // Load from pool
        const res = await Api.pools.get(poolId)
        if (res?.pool) {
          setPoolContext(res.pool)
          const ids = res.pool.members.map((m) => m.intentId)
          setIntentIds(ids)
          // Preview with selected allocation
          const optRes = await Api.optimization.preview(ids, allocation)
          setOptimization(optRes?.optimization || res.pool.optimization)
        }
      } else if (intentId) {
        // Run match to get recommended intent group
        const matchRes = await Api.match(intentId)
        if (matchRes?.intentIds?.length) {
          setIntentIds(matchRes.intentIds)
          const optRes = await Api.optimization.preview(matchRes.intentIds, allocation)
          setOptimization(optRes?.optimization || matchRes.optimization)
        } else {
          setOptimization(matchRes?.optimization || null)
        }
      } else {
        // Check if user has an active pool or intent
        const myPools = await Api.pools.mine()
        if (myPools?.pools?.length) {
          const latest = myPools.pools[0]
          setPoolContext(latest)
          const ids = latest.members.map((m) => m.intentId)
          setIntentIds(ids)
          const optRes = await Api.optimization.preview(ids, allocation)
          setOptimization(optRes?.optimization || latest.optimization)
        } else {
          const myIntents = await Api.intents.mine()
          const active = (myIntents?.intents || []).filter((i) => i.status === 'active' || i.status === 'reserved')
          if (active.length > 0) {
            const matchRes = await Api.match(active[0].id)
            if (matchRes?.intentIds?.length) {
              setIntentIds(matchRes.intentIds)
              const optRes = await Api.optimization.preview(matchRes.intentIds, allocation)
              setOptimization(optRes?.optimization || matchRes.optimization)
            } else {
              setOptimization(matchRes?.optimization || null)
            }
          } else {
            setOptimization(null)
          }
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [poolId, intentId, allocation])

  useEffect(() => {
    loadOptimization()
  }, [loadOptimization])

  // Handle allocation switch
  const handleToggleAllocation = async (rule) => {
    if (rule === allocation) return
    setAllocation(rule)
    if (intentIds.length > 0) {
      setLoading(true)
      try {
        const res = await Api.optimization.preview(intentIds, rule)
        if (res?.optimization) {
          setOptimization(res.optimization)
        }
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    }
  }

  const rec = optimization?.recommendation

  return (
    <Layout meta={meta}>
      {/* Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#15803D]">
          03 / Cost optimization decision engine
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
          Demand Intelligence Step 4 of 7
        </span>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F3D1E] tracking-tight">
            If one student loses money, <span className="highlight-lime">it is not a pool.</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">
            DropPool calculates solo checkout fees vs shared order charges in integer paise with zero floating-point error.
          </p>
        </div>

        {/* Allocation Rule Switcher */}
        {optimization && (
          <div className="inline-flex bg-white p-1 rounded-2xl border border-[#E2EBDD] text-xs shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => handleToggleAllocation('proportional')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                allocation === 'proportional'
                  ? 'bg-[#0F3D1E] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Proportional Split
            </button>
            <button
              onClick={() => handleToggleAllocation('equal')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                allocation === 'equal'
                  ? 'bg-[#0F3D1E] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Equal Split
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800">
          <p className="font-bold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#E2EBDD] shadow-xs">
          <div className="w-10 h-10 border-3 border-[#84CC16] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#0F3D1E]">Calculating mathematical optimization…</p>
        </div>
      ) : !optimization ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#E2EBDD] shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#ECFCCB] text-xl flex items-center justify-center mb-3">
            🧮
          </div>
          <h2 className="text-lg font-bold text-[#0F3D1E]">No active cart to optimize yet</h2>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            Create an intent or run matching to see the server's real cost breakdown.
          </p>
          <Link
            to="/intent"
            className="mt-5 inline-flex items-center px-6 py-3 rounded-xl bg-[#0F3D1E] hover:bg-[#165a2d] text-white text-xs font-bold transition-colors"
          >
            Create Intent →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Totals, Per-Member Table & State Card */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Comparison Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDD] shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0F3D1E]">
                    {poolContext ? poolContext.title || `Pool ${poolContext.code}` : 'Live Order Fee Comparison'}
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">{optimization.allocationRule}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                  {optimization.members?.length} Students
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Sum of Individual Carts
                  </p>
                  <p className="text-3xl font-extrabold text-[#0F3D1E] mt-1">
                    {formatPaise(
                      optimization.members.reduce((s, m) => s + (m.individualTotalPaise || 0), 0)
                    )}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">Separate deliveries + small cart fees</p>
                </div>

                <div className="sm:col-span-2 flex justify-center text-[#15803D] text-2xl font-bold">
                  →
                </div>

                <div className="sm:col-span-5 bg-[#F0FDF4] rounded-2xl p-4 sm:p-5 border border-[#BBF7D0]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#15803D]">
                    One Pooled Cart
                  </p>
                  <p className="text-3xl font-extrabold text-[#0F3D1E] mt-1">
                    {formatPaise(optimization.pooled?.totalPaise)}
                  </p>
                  <p className="text-xs text-[#475569] mt-1">
                    Products {formatPaise(optimization.pooled?.subtotalPaise)} + Fees {formatPaise(optimization.pooled?.feesPaise)}
                  </p>
                </div>
              </div>
            </div>

            {/* Three Real States: 'pool', 'individual', 'insufficient_data' */}
            {rec === 'pool' ? (
              <div className="p-5 rounded-3xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#84CC16] text-[#0F3D1E] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F3D1E]">Pool Approved: Everyone Saves Money</p>
                  <p className="text-xs text-[#15803D] mt-0.5 font-medium leading-relaxed">
                    {optimization.reason}
                  </p>
                </div>
              </div>
            ) : rec === 'individual' ? (
              <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                  ✕
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-900">Pooling Rejected: Negative Net Savings</p>
                  <p className="text-xs text-rose-700 mt-0.5 font-medium leading-relaxed">
                    {optimization.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                  ⚠️
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Comparison Incomplete: Fee Data Missing</p>
                  <p className="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
                    {optimization.reason}
                  </p>
                </div>
              </div>
            )}

            {/* The everyone-saves check table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDD] shadow-xs">
              <h3 className="text-lg font-bold text-[#0F3D1E] mb-4">The everyone-saves check</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      <th className="pb-3">Member</th>
                      <th className="pb-3 text-center">Alone Total</th>
                      <th className="pb-3 text-center">Pooled Share</th>
                      <th className="pb-3 text-right">Net Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {optimization.members.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAF6] transition-colors">
                        <td className="py-3.5">
                          <p className="font-bold text-[#0F3D1E]">{m.label}</p>
                          <p className="text-[10px] text-[#64748B]">Cart: {formatPaise(m.subtotalPaise)}</p>
                        </td>
                        <td className="py-3.5 text-center text-[#475569]">
                          {formatPaise(m.individualTotalPaise)}
                          <span className="block text-[9px] text-[#94A3B8]">
                            (fees {formatPaise(m.individualFeesPaise)})
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-bold text-[#0F3D1E]">
                          {formatPaise(m.sharePaise)}
                          <span className="block text-[9px] text-[#94A3B8]">
                            (split fee {formatPaise(m.sharedFeePaise)})
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-bold">
                          {m.savingsPaise > 0 ? (
                            <span className="text-[#15803D] inline-flex items-center gap-1">
                              <span>✓</span>
                              <span>{formatPaise(m.savingsPaise)} ({m.savingsPercent}%)</span>
                            </span>
                          ) : m.savingsPaise === 0 ? (
                            <span className="text-gray-500">₹0 (No savings)</span>
                          ) : (
                            <span className="text-rose-600 inline-flex items-center gap-1">
                              <span>✕</span>
                              <span>{formatPaise(m.savingsPaise)}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Savings card, fee lines & deck explainer */}
          <div className="lg:col-span-5 space-y-6">
            {/* Total Savings Card */}
            <div className="bg-[#0F3D1E] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#A3E635] text-[#0F3D1E] mb-4">
                {rec === 'pool' ? 'POSITIVE NET SAVINGS' : 'DECISION RESULT'}
              </span>

              <p className="text-4xl sm:text-5xl font-extrabold text-[#A3E635] tracking-tight">
                {formatPaise(optimization.totalSavingsPaise)}
              </p>
              <p className="text-sm font-semibold text-white/90 mt-2">
                Total group savings across members
              </p>
              <p className="text-xs text-white/60 mt-1">
                {optimization.allocationRule}
              </p>
            </div>

            {/* Pooled Fee Lines Breakdown */}
            {optimization.pooled?.feeLines?.length > 0 && (
              <div className="bg-[#F0FDF4] rounded-3xl p-6 sm:p-7 border border-[#BBF7D0]">
                <h3 className="text-sm font-bold text-[#0F3D1E] mb-3">Pooled Order Fee Lines</h3>
                <div className="space-y-2.5 text-xs">
                  {optimization.pooled.feeLines.map((line) => (
                    <div key={line.key} className="flex items-center justify-between text-[#475569]">
                      <span>{line.label} {line.waived && <span className="text-[#15803D] font-bold">(Waived)</span>}</span>
                      <span className="font-bold text-[#0F3D1E]">{formatPaise(line.amountPaise)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#BBF7D0] flex items-center justify-between font-bold text-[#0F3D1E]">
                    <span>Total Shared Charges</span>
                    <span className="text-[#15803D]">{formatPaise(optimization.pooled.feesPaise)}</span>
                  </div>
                </div>
                <p className="mt-4 pt-2 border-t border-[#BBF7D0] text-[10px] text-[#64748B]">
                  Illustrative platform fee profile v{optimization.feeProfileVersion ?? 0}.
                </p>
              </div>
            )}

            {/* Clearly labelled "How the rule works (illustrative)" static explainer from deck */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2EBDD] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  Illustrative Rule Explainer
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#0F3D1E]">How the rejection rule works</h4>
              <p className="text-xs text-[#475569] mt-2 leading-relaxed">
                <strong>Pitch deck example:</strong> 3 students each order ₹120 of snacks. Individually, each might pay ₹120 items + ₹0–10 fees = ₹120–130. If combined cart pays ₹360 items + ₹24 shared fees = ₹384 total, but an unfair allocation makes one student pay ₹128 while their solo cart was ₹120, that student loses ₹8.
              </p>
              <p className="text-xs text-[#0F3D1E] font-semibold mt-2 leading-relaxed">
                DropPool immediately rejects this pool. A lower group total is not enough — <em>every single participating student must save money</em>.
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
