import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { Api, errorMessage } from '../lib/api'
import { formatPaise } from '../lib/money'
import { formatDateTime } from '../lib/format'
import avatarAanya from '../assets/avatar_aanya.png'

export default function MatchingResultsPage() {
  const [searchParams] = useSearchParams()
  const intentIdParam = searchParams.get('intent')
  const { user, meta } = useAuth()
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
      .catch(() => {})

    return () => { cancelled = true }
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
      setProposal(res)
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

  // Load hostel board
  const loadHostelBoard = async () => {
    setLoadingBoard(true)
    setShowBoard(true)
    try {
      const data = await Api.intents.board()
      setBoardIntents(data?.intents || [])
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
      if (res?.pool?.id) {
        navigate(`/pools/${res.pool.id}`)
      } else {
        setMatchingError('Failed to create pool: unexpected server response')
      }
    } catch (err) {
      setMatchingError(errorMessage(err))
    } finally {
      setCreatingPool(false)
    }
  }

  return (
    <Layout meta={meta}>
      {/* Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#15803D]">
          02 / Match demand & compatible carts
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
          Demand Intelligence Step 2 & 3 of 7
        </span>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F3D1E] tracking-tight">
            Different carts. <span className="highlight-lime">Same wavelength.</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">
            Server matching analyzes delivery window overlap, proximity in {user?.hostel || 'Hostel'}, and product compatibility.
          </p>
        </div>

        {/* Intent switcher & re-run button */}
        {myIntents.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {myIntents.length > 1 && (
              <select
                value={activeIntentId}
                onChange={(e) => setActiveIntentId(e.target.value)}
                className="bg-white border border-[#E2EBDD] text-xs font-semibold text-[#0F3D1E] rounded-xl px-3 py-2 focus:outline-none"
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
          <p className="text-xs text-[#64748B] mt-1">Comparing proximity, time overlap, and cost benefit</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Matched Members & Diagram */}
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
                <p className="font-bold text-[#15803D] mb-1">Server Match Summary:</p>
                <p className="leading-relaxed">{proposal.explanation}</p>
              </div>

              {/* Members Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proposal.members.map((member, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 border border-[#E2EBDD] shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ECFCCB] text-[#3F6212] font-bold text-sm flex items-center justify-center shrink-0">
                        {member.name?.[0] || 'S'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F3D1E]">
                          {member.name} {idx === 0 && <span className="text-[#65A30D] text-xs font-semibold">(You · Host)</span>}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {member.hostel} · Block {member.block} · Floor {member.floor}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">{member.itemCount} items</span>
                      <span className="font-bold text-[#0F3D1E]">Cart: {formatPaise(member.subtotalPaise)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Why other candidates were accepted or rejected */}
              {proposal.classified?.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#BBF7D0]">
                  <p className="text-xs font-bold text-[#0F3D1E] mb-2">Campus Demand Classification:</p>
                  <div className="space-y-1.5">
                    {proposal.classified.map((c, i) => (
                      <div key={i} className="flex items-start justify-between text-[11px] bg-white/70 p-2 rounded-lg">
                        <span className="text-[#475569]">{c.reason}</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                          c.class === 'strong' ? 'bg-[#ECFCCB] text-[#3F6212]' : c.class === 'potential' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.class}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Pool Summary & Form Pool CTA */}
            <div className="lg:col-span-4">
              <div className="bg-[#0F3D1E] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#A3E635] text-[#0F3D1E] mb-4">
                  EVERYONE SAVES MONEY
                </span>

                <h2 className="text-2xl font-bold text-white tracking-tight">
                  A small pool. <br />
                  A better total.
                </h2>
                <p className="text-xs text-white/70 mt-1">
                  {proposal.members?.length} students pooling delivery fees
                </p>

                <div className="my-6 border-t border-white/10" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-white/80">
                    <span>Pooled products</span>
                    <span className="font-bold text-white text-base">
                      {formatPaise(proposal.optimization?.pooled?.subtotalPaise)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white/80">
                    <span>Shared platform fees</span>
                    <span className="font-bold text-white text-base">
                      {formatPaise(proposal.optimization?.pooled?.feesPaise)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-3xl font-extrabold text-[#A3E635] tracking-tight">
                    {formatPaise(proposal.optimization?.totalSavingsPaise)}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">
                    total pool savings combined
                  </p>
                </div>

                {/* Primary CTA: Form Pool */}
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={handleCreatePool}
                    disabled={creatingPool}
                    className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#84CC16] hover:bg-[#A3E635] text-[#0F3D1E] text-sm font-bold shadow-xs transition-all hover:shadow disabled:opacity-50"
                  >
                    <span>{creatingPool ? 'Forming Pool on Server…' : 'Lock into this Pool'}</span>
                    <span className="ml-2 font-bold">→</span>
                  </button>

                  <Link
                    to="/optimizer"
                    className="w-full inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors text-center"
                  >
                    Inspect math in Cost Optimizer →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : proposal?.status === 'individual' ? (
        /* Status 2: Individual ordering is cheaper (Pooling Rejected) */
        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-xs">
          <div className="max-w-xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 mb-3">
              Pooling Rejected by Server Engine
            </span>
            <h2 className="text-2xl font-bold text-[#0F3D1E]">
              Order individually — pooling is not recommended
            </h2>
            <p className="text-sm text-[#475569] mt-2 leading-relaxed">
              {proposal.explanation}
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <p className="font-bold mb-1">DropPool Core Product Rule:</p>
              <p>
                We strictly reject any pool proposal that makes any participant pay more than ordering alone. For example, if a student has an active free delivery pass or zero small-cart fees, bundling them into a shared delivery charge is not recommended.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/optimizer"
                className="px-5 py-2.5 rounded-xl bg-[#0F3D1E] text-white text-xs font-bold hover:bg-[#165a2d] transition-colors"
              >
                Inspect Cost Breakdown →
              </Link>
              <button
                type="button"
                onClick={loadHostelBoard}
                className="px-5 py-2.5 rounded-xl bg-[#F0FDF4] text-[#15803D] text-xs font-bold border border-[#BBF7D0] hover:bg-[#DCFCE7] transition-colors"
              >
                View Hostel Intent Board
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Status 3: None / No compatible students yet */
        <div className="bg-white rounded-3xl p-8 border border-[#E2EBDD] shadow-xs">
          <div className="max-w-xl">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#F8FAF6] text-[#475569] border border-gray-200 mb-3">
              No Matches Right Now
            </span>
            <h2 className="text-2xl font-bold text-[#0F3D1E]">
              No compatible students yet in your delivery window
            </h2>
            <p className="text-sm text-[#475569] mt-2 leading-relaxed">
              {proposal?.explanation || 'Other students in your hostel have not placed active carts on this platform for this window.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadHostelBoard}
                className="px-5 py-2.5 rounded-xl bg-[#0F3D1E] text-white text-xs font-bold hover:bg-[#165a2d] transition-colors"
              >
                Check Hostel Active Carts Board
              </button>
              <Link
                to="/intent"
                className="px-5 py-2.5 rounded-xl bg-[#F8FAF6] text-[#0F3D1E] text-xs font-bold border border-[#E2EBDD] hover:bg-gray-100 transition-colors"
              >
                Edit Time Window / Platform
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hostel Active Carts Board Modal / Drawer */}
      {showBoard && (
        <div className="mt-10 bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDD] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F3D1E]">Hostel Demand Board ({user?.hostel || 'Hostel'})</h2>
              <p className="text-xs text-[#64748B]">Active intents in your hostel (names and items only, no private details)</p>
            </div>
            <button
              onClick={() => setShowBoard(false)}
              className="text-xs font-bold text-gray-500 hover:text-black"
            >
              Close ✕
            </button>
          </div>

          {loadingBoard ? (
            <p className="text-xs text-gray-500 py-4">Loading active hostel intents…</p>
          ) : boardIntents.length === 0 ? (
            <p className="text-xs text-[#64748B] py-4 bg-[#F8FAF6] p-4 rounded-xl border border-dashed border-[#E2EBDD]">
              No other active student intents found in {user?.hostel || 'your hostel'} right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {boardIntents.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-[#F8FAF6] border border-[#E2EBDD] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F3D1E]">{b.studentName}</span>
                    <span className="font-semibold text-[#15803D] uppercase text-[10px]">{b.platform}</span>
                  </div>
                  <p className="text-[11px] text-[#475569] mt-1">
                    Block {b.block} · Floor {b.floor}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Items: {b.items?.map((i) => `${i.name} (x${i.qty})`).join(', ')}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-2">
                    Window: {formatDateTime(b.windowStart)} – {formatDateTime(b.windowEnd)}
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
