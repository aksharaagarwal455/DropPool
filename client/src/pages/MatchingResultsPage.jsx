import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { Api, errorMessage } from '../lib/api'
import { formatPaise } from '../lib/money'
import { formatDateTime } from '../lib/format'

export default function MatchingResultsPage() {
  const [searchParams] = useSearchParams()
  const intentIdParam = searchParams.get('intent')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeIntentId, setActiveIntentId] = useState(intentIdParam || '')
  const [myIntents, setMyIntents] = useState([])
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matchingError, setMatchingError] = useState(null)
  const [creatingPool, setCreatingPool] = useState(false)

  // Hostel board
  const [boardIntents, setBoardIntents] = useState([])
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [showBoard, setShowBoard] = useState(false)

  // Load user's intents if none specified in URL
  useEffect(() => {
    let cancelled = false
    Api.intents.mine()
      .then((res) => {
        if (cancelled) return
        const active = (res?.intents || []).filter((i) => i.status === 'active' || i.status === 'reserved')
        setMyIntents(active)
        if (!intentIdParam && active.length > 0) {
          setActiveIntentId(active[0].id)
        }
      })
      .catch(() => { })

    return () => {
      cancelled = true
    }
  }, [intentIdParam])

  // Run server matching
  const runMatch = useCallback(async (id) => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setMatchingError(null)

    try {
      const res = await Api.match(id)
      const data = res?.proposal || res
      setProposal(data)
    } catch (err) {
      setMatchingError(errorMessage(err))
      setProposal(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeIntentId) {
      runMatch(activeIntentId)
    } else {
      setLoading(false)
    }
  }, [activeIntentId, runMatch])

  // Load campus board
  const loadCampusBoard = async () => {
    setLoadingBoard(true)
    setShowBoard(true)
    try {
      const data = await Api.intents.board()
      setBoardIntents(data?.intents || (Array.isArray(data) ? data : []))
    } catch {
      setBoardIntents([])
    } finally {
      setLoadingBoard(false)
    }
  }

  // Create pool from matched proposal
  const handleCreatePool = async () => {
    if (!proposal?.intentIds?.length) return
    setCreatingPool(true)
    setMatchingError(null)

    try {
      const res = await Api.pools.create(proposal.intentIds)
      const poolId = res?.pool?.id || res?.id
      if (poolId) {
        navigate(`/pools/${poolId}`)
      } else {
        setMatchingError('Failed to create pool: unexpected server response')
      }
    } catch (err) {
      setMatchingError(errorMessage(err))
    } finally {
      setCreatingPool(false)
    }
  }

  const pooledSubtotal = proposal?.optimization?.pooled?.subtotalPaise || 0
  const freeDeliveryThreshold =
    (proposal?.gapPaise !== null && proposal?.gapPaise !== undefined)
      ? pooledSubtotal + proposal.gapPaise
      : 19900
  const targetPct =
    freeDeliveryThreshold > 0
      ? Math.min(100, Math.round((pooledSubtotal / freeDeliveryThreshold) * 100))
      : 100

  return (
    <Layout>
      {/* Eyebrow & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#15803D]">
          03 / Proximity & Cart Matching
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFCCB] text-[#3F6212] border border-[#D9F99D]">
          Banasthali Vidyapeeth · Goal-Driven Engine
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Matching <span className="highlight-lime">Results</span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#475569]">
            Nearest students first. Pools only when every participating student saves money.
          </p>
        </div>

        {/* Intent Selector if user has multiple active intents */}
        {myIntents.length > 0 && (
          <div className="flex items-center gap-2">
            {myIntents.length > 1 && (
              <select
                value={activeIntentId}
                onChange={(e) => setActiveIntentId(e.target.value)}
                className="bg-white border border-[#E2EBDD] rounded-xl px-3 py-2 text-xs font-bold text-[#0F3D1E] shadow-2xs focus:outline-none focus:border-[#84CC16]"
              >
                {myIntents.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.platform.toUpperCase()} ({formatPaise(it.subtotalPaise)})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => runMatch(activeIntentId)}
              disabled={loading}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0] transition-colors"
            >
              🔄 Re-run Matching
            </button>
          </div>
        )}
      </div>

      {matchingError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800">
          <p className="font-bold">Matching error:</p>
          <p className="mt-0.5">{matchingError}</p>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#E2EBDD] shadow-xs">
          <div className="w-10 h-10 border-3 border-[#84CC16] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#0F3D1E]">Analyzing campus cart demand…</p>
          <p className="text-xs text-[#64748B] mt-1">Expanding rings from same floor to nearby hostels</p>
        </div>
      ) : !activeIntentId ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#E2EBDD] shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#ECFCCB] text-xl flex items-center justify-center mb-3">
            📋
          </div>
          <h2 className="text-lg font-bold text-[#0F3D1E]">No active intent to match</h2>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            You need an active shopping intent before we can find compatible students in your hostel.
          </p>
          <Link
            to="/intent"
            className="mt-5 inline-flex items-center px-6 py-3 rounded-xl bg-[#0F3D1E] hover:bg-[#165a2d] text-white text-xs font-bold transition-colors"
          >
            Create Shopping Intent →
          </Link>
        </div>
      ) : proposal?.status === 'pool' ? (
        /* Status 1: Recommended Pool Formed! */
        <div className="space-y-8">
          {/* Target Progress Bar Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#BBF7D0] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  proposal.targetReached
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {proposal.targetReached ? '🎯 Free Delivery Target Unlocked' : '⚡ Partial Pool'}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  Combined Subtotal: <strong>{formatPaise(pooledSubtotal)}</strong>
                </span>
              </div>

              <div className="text-right">
                {proposal.targetReached ? (
                  <span className="text-xs font-bold text-emerald-700">Zero Delivery Fee Unlocked</span>
                ) : (
                  <span className="text-xs font-bold text-amber-800">
                    {formatPaise(proposal.gapPaise)} more to Free Delivery
                  </span>
                )}
              </div>
            </div>

            {/* Progress track */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  proposal.targetReached ? 'bg-[#15803D]' : 'bg-amber-500'
                }`}
                style={{ width: `${targetPct}%` }}
              />
            </div>

            {proposal.membersNeeded && !proposal.targetReached && (
              <p className="text-[11px] text-amber-700 italic">
                💡 Need approximately {proposal.membersNeeded} more student cart to waive delivery fees entirely.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Matched Members & Details */}
            <div className="lg:col-span-8 bg-[#F0FDF4] rounded-3xl p-6 sm:p-8 border border-[#BBF7D0]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0F3D1E] text-[#A3E635]">
                    ✓ Pool Recommended
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#0F3D1E] border border-gray-200">
                    {proposal.members?.length} Students
                  </span>
                </div>

                {proposal.score && (
                  <span className="text-xs font-bold text-[#15803D] bg-white px-3 py-1 rounded-full border border-[#BBF7D0]">
                    Match Score: {proposal.score.total}/100
                  </span>
                )}
              </div>

              {/* Server Explanation */}
              <div className="mb-6 p-4 rounded-2xl bg-white border border-[#BBF7D0] text-xs sm:text-sm text-[#0F3D1E]">
                <p className="font-bold text-[#15803D] mb-1">Decision Engine Result:</p>
                <p className="leading-relaxed">{proposal.explanation}</p>
              </div>

              {/* Members Grid with Proximity Labels & Individual Net Savings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proposal.members.map((member, idx) => {
                  const optRow = proposal.optimization?.members?.find((m) => m.id === String(member.intentId))
                  return (
                    <div key={idx} className="bg-white rounded-2xl p-5 border border-[#E2EBDD] shadow-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#ECFCCB] text-[#3F6212] font-bold text-sm flex items-center justify-center shrink-0">
                            {member.name?.[0] || 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0F3D1E]">
                              {member.name} {member.isSelf && <span className="text-[#65A30D] text-xs font-semibold">(You · Host)</span>}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {member.hostel} · Block {member.block} · Floor {member.floor}
                            </p>
                          </div>
                        </div>

                        {member.distanceLabel && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-100 text-primary-900">
                            {member.distanceLabel}
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[#64748B] block text-[10px]">Cart Subtotal</span>
                          <span className="font-bold text-[#0F3D1E]">{formatPaise(member.subtotalPaise)}</span>
                        </div>

                        {optRow && (
                          <div className="text-right">
                            <span className="text-[#15803D] block text-[10px] font-semibold">Net Saved</span>
                            <span className="font-extrabold text-[#15803D]">+{formatPaise(optRow.savingsPaise)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Campus Demand Classification */}
              {proposal.classified?.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#BBF7D0]">
                  <p className="text-xs font-bold text-[#0F3D1E] mb-2">Campus Demand Classification:</p>
                  <div className="space-y-1.5">
                    {proposal.classified.map((c, i) => (
                      <div key={i} className="flex items-start justify-between text-[11px] bg-white/70 p-2 rounded-lg">
                        <span className="text-[#475569]">{c.reason}</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${c.class === 'strong' ? 'bg-[#ECFCCB] text-[#3F6212]' : c.class === 'potential' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {c.class}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Cost Optimizer Summary & Form Pool CTA */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E2EBDD] shadow-xs space-y-5">
                <h3 className="text-lg font-bold text-[#0F3D1E]">Financial Breakdown</h3>

                {proposal.optimization && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-[#475569]">
                      <span>Combined Cart Subtotal:</span>
                      <span className="font-semibold text-[#0F3D1E]">{formatPaise(proposal.optimization.pooled.subtotalPaise)}</span>
                    </div>

                    <div className="flex justify-between text-xs text-[#475569]">
                      <span>Shared Platform Fees:</span>
                      <span className="font-semibold text-[#0F3D1E]">{formatPaise(proposal.optimization.pooled.feesPaise)}</span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-bold text-[#0F3D1E]">
                      <span>Total Pool Payable:</span>
                      <span className="text-[#15803D]">{formatPaise(proposal.optimization.pooled.totalPaise)}</span>
                    </div>

                    <div className="p-3 bg-[#ECFCCB]/60 rounded-xl border border-[#D9F99D] flex justify-between items-center text-xs">
                      <span className="font-bold text-[#3F6212]">Collective Savings:</span>
                      <span className="text-base font-extrabold text-[#15803D]">+{formatPaise(proposal.optimization.totalSavingsPaise)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreatePool}
                  disabled={creatingPool}
                  className="w-full py-4 rounded-2xl bg-[#0F3D1E] hover:bg-[#165a2d] text-white font-bold text-sm shadow-xs transition-all hover:shadow hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {creatingPool ? 'Reserving Intents & Creating…' : 'Create Shared Pool →'}
                </button>

                <p className="text-[11px] text-gray-400 text-center">
                  You become the designated host. Intents are reserved in a race-safe database transaction.
                </p>
              </div>

              {/* Illustrative Fees Disclaimer */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500 space-y-1">
                <p className="font-bold text-gray-700">Platform Fee Notice</p>
                <p>Illustrative fees, not verified current platform pricing.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Status 2: No Matches or Individual Rejection */
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-200 text-center max-w-2xl mx-auto space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-2xl font-bold">
              {proposal?.status === 'individual' ? '⚠️' : '🔍'}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {proposal?.status === 'individual' ? 'Pooling Not Recommended' : 'No Compatible Matches Found'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                {proposal?.explanation || 'No students currently match your platform, delivery window, and campus walking proximity.'}
              </p>
            </div>

            {/* Diagnostic Guide */}
            <div className="bg-gray-50 rounded-2xl p-5 text-left border border-gray-100 space-y-2 text-xs">
              <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">What is needed for a pool match:</p>
              <ul className="space-y-1.5 text-gray-600 list-disc list-inside">
                <li>Same shopping platform (Blinkit, Zepto, or Instamart)</li>
                <li>Overlapping delivery windows (at least 15 min mutual overlap)</li>
                <li>Item prices filled for every line item</li>
                <li>Nearby walking proximity (same floor, block, or nearby hostel within walking radius)</li>
              </ul>
            </div>

            {/* Action Options */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/intent"
                className="px-5 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs transition-colors shadow-2xs"
              >
                ← Widen Delivery Window
              </Link>
              <button
                onClick={loadCampusBoard}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 font-bold text-xs text-gray-800 transition-colors shadow-2xs"
              >
                📋 Browse Campus Demand Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campus Demand Board Section */}
      {showBoard && (
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-900">
                Live Campus Demand
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 mt-1">
                Nearby Active Student Carts (Nearest-First)
              </h2>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {boardIntents.length} active demand intents
            </span>
          </div>

          {loadingBoard ? (
            <div className="py-8 text-center text-xs text-gray-500">Loading campus intents…</div>
          ) : boardIntents.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">No active intents waiting in nearby hostels.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boardIntents.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 capitalize">{item.platform}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-900 uppercase">
                      {item.distanceLabel || 'nearby'}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Hostel: <strong>{item.hostel}</strong> {item.block ? `· Block ${item.block}` : ''}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Window: {formatDateTime(item.windowStart)} – {formatDateTime(item.windowEnd)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
