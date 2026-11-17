import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { Api, errorMessage } from '../lib/api'
import { formatPaise } from '../lib/money'
import heroDiagram from '../assets/hero_diagram.png'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeIntents, setActiveIntents] = useState([])
  const [activePools, setActivePools] = useState([])
  const [demandBoard, setDemandBoard] = useState(null)
  const [demandSummary, setDemandSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingIntentId, setCancellingIntentId] = useState(null)

  const isMountedRef = useRef(true)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [intentsRes, poolsRes, boardRes, demandRes] = await Promise.allSettled([
        Api.intents.mine(),
        Api.pools.mine(),
        Api.intents.board(),
        Api.demand(),
      ])

      if (!isMountedRef.current) return

      if (intentsRes.status === 'fulfilled') {
        const list = Array.isArray(intentsRes.value) ? intentsRes.value : intentsRes.value?.intents || []
        // Active intents that are active, matched, or reserved
        setActiveIntents(list.filter((i) => ['active', 'matched', 'reserved'].includes(i.status)))
      }

      if (poolsRes.status === 'fulfilled') {
        const pList = Array.isArray(poolsRes.value) ? poolsRes.value : poolsRes.value?.pools || []
        // Pools in progress
        setActivePools(
          pList.filter((p) =>
            ['proposed', 'confirmed', 'awaiting_payments', 'payments_confirmed', 'order_placed', 'ready_for_pickup'].includes(p.status)
          )
        )
      }

      if (boardRes.status === 'fulfilled') {
        setDemandBoard(boardRes.value)
      }

      if (demandRes.status === 'fulfilled') {
        setDemandSummary(demandRes.value)
      }
    } catch (err) {
      if (isMountedRef.current) setError(errorMessage(err))
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadDashboardData()
    return () => {
      isMountedRef.current = false
    }
  }, [loadDashboardData])

  async function handleCancelIntent(intentId) {
    if (!window.confirm('Cancel this shopping intent?')) return
    setCancellingIntentId(intentId)
    try {
      await Api.intents.cancel(intentId)
      await loadDashboardData()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setCancellingIntentId(null)
    }
  }

  function getStatusPill(status) {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Looking for Peers</span>
      case 'matched':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-300">Matches Found</span>
      case 'reserved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Reserved in Pool</span>
      case 'pooled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Pooled</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>
    }
  }

  function getPoolStatusBadge(status) {
    switch (status) {
      case 'proposed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">Forming</span>
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">All Confirmed</span>
      case 'awaiting_payments':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800">Awaiting Payments</span>
      case 'payments_confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">Paid</span>
      case 'order_placed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800">In Transit</span>
      case 'ready_for_pickup':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-800 text-white">Ready for Pickup</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>
    }
  }

  // Hostel specific active intent count from board
  const myHostelStats = demandBoard?.breakdown?.find(
    (b) => b.hostel?.toLowerCase() === user?.hostel?.toLowerCase()
  )

  return (
    <Layout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-800">
            A little coordination. A better cart.
          </p>
          <span className="text-xs font-medium text-gray-500">
            Banasthali Vidyapeeth · {user?.hostel || 'Hostel'}
          </span>
        </div>

        {/* Hero Banner */}
        <div className="bg-primary-50 rounded-3xl p-6 sm:p-10 border border-primary-200 relative overflow-hidden shadow-2xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 z-10 space-y-4">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-white text-primary-900 shadow-2xs">
                Made for your hostel, not the whole internet.
              </span>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
                Your campus. <br />
                <span className="highlight-lime">One smarter way</span> to shop.
              </h1>

              <p className="text-sm sm:text-base font-medium text-gray-700">
                Split delivery fees and waive minimum-cart surcharges on Blinkit, Zepto, and Instamart.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                DropPool pools carts only when <strong>every single member saves money</strong>.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  to="/intent"
                  className="inline-flex items-center px-6 py-3.5 rounded-2xl bg-primary-800 hover:bg-primary-900 text-white text-sm font-bold shadow-xs transition-all hover:-translate-y-0.5"
                >
                  <span className="mr-2 text-lg leading-none">+</span>
                  Create Shopping Intent
                </Link>

                <Link
                  to="/optimizer"
                  className="inline-flex items-center text-xs font-bold text-primary-900 hover:text-primary-950 transition-colors py-2 px-3 rounded-xl bg-white/80 border border-primary-200"
                >
                  <span>See How Cost Split Works</span>
                  <span className="ml-1 text-sm">↗</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm bg-white/90 backdrop-blur-xs rounded-2xl p-5 border border-primary-100 shadow-2xs">
                <img
                  src={heroDiagram}
                  alt="Individual carts converging into shared pool"
                  className="w-full h-auto object-contain"
                />
                <div className="flex justify-between items-center text-xs font-semibold text-gray-600 mt-3 px-1 border-t border-gray-100 pt-2">
                  <span>Small carts</span>
                  <span className="text-primary-800 font-bold">1 Zero-Fee Shared Pool</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Campus Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs">
            <p className="text-xs font-semibold text-gray-500">Campus Activity (30 Days)</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary-900">
                {demandSummary?.totals?.intentsLast30Days ?? 0}
              </span>
              <span className="text-xs text-gray-400">total intents</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {demandSummary?.totals?.activeIntents ?? 0} actively waiting right now
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs">
            <p className="text-xs font-semibold text-gray-500">Your Active Pools</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0F172A]">
                {activePools.length < 10 ? `0${activePools.length}` : activePools.length}
              </span>
              <span className="text-xs text-gray-400">in progress</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {activePools.length > 0 ? 'Delivery underway' : 'No active runs'}
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs">
            <p className="text-xs font-semibold text-gray-500">Peers in {user?.hostel || 'Hostel'}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary-800">
                {myHostelStats?.total ?? demandBoard?.totalActiveIntents ?? 0}
              </span>
              <span className="text-xs text-gray-400">active demand</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Same hostel order grouping
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Active Pools Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">Your Active Pools</h2>
              <p className="text-xs sm:text-sm text-gray-500">Orders currently forming, awaiting payment, or in delivery.</p>
            </div>
            <Link to="/pools" className="text-xs font-bold text-primary-800 hover:underline">
              View all pools →
            </Link>
          </div>

          {activePools.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-2xs space-y-2">
              <p className="text-sm font-semibold text-gray-700">No active pools right now</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Once you match with hostel mates and confirm a group, your active pool progress will appear here.
              </p>
              <div className="pt-2">
                <Link
                  to="/intent"
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-xs"
                >
                  Start a Cart Intent
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePools.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-gray-900">{p.code}</span>
                        {p.isHost && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-800 text-white">
                            You Host
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">
                        {p.platform} · {p.memberCount} members
                      </p>
                    </div>
                    {getPoolStatusBadge(p.status)}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Your Share</p>
                      <p className="text-base font-extrabold text-primary-900">
                        {p.mySharePaise ? formatPaise(p.mySharePaise) : 'Calculating'}
                      </p>
                    </div>
                    <Link
                      to={`/pools/${p.id}`}
                      className="px-4 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-900 font-bold text-xs transition-colors"
                    >
                      Open Run Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Shopping Intents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">Your Active Intents</h2>
              <p className="text-xs sm:text-sm text-gray-500">Carts you want to order and match with hostel peers.</p>
            </div>
            <Link to="/intent" className="text-xs font-bold text-primary-800 hover:underline">
              + New intent
            </Link>
          </div>

          {activeIntents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-2xs space-y-2">
              <p className="text-sm font-semibold text-gray-700">No active shopping intents</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Need essentials from Blinkit, Zepto, or Instamart? Create an intent to find peers in your hostel.
              </p>
              <div className="pt-2">
                <Link
                  to="/intent"
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-xs"
                >
                  + Create Shopping Intent
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeIntents.map((intent) => (
                <div
                  key={intent.id}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-bold text-sm text-gray-900">{intent.platform}</span>
                        <span className="text-xs text-gray-400">· {intent.items?.length || 0} items</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Subtotal: <strong className="text-gray-900">{formatPaise(intent.subtotalPaise)}</strong>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Window: {new Date(intent.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(intent.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {getStatusPill(intent.status)}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCancelIntent(intent.id)}
                      disabled={cancellingIntentId === intent.id}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold disabled:opacity-50"
                    >
                      {cancellingIntentId === intent.id ? 'Cancelling...' : 'Cancel'}
                    </button>

                    <button
                      onClick={() => navigate('/matches', { state: { intentId: intent.id } })}
                      className="px-4 py-2 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs transition-colors"
                    >
                      Find Matches →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campus Demand Intelligence & Hostel Board Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-900">
                Campus Demand Intelligence
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">
                Banasthali Vidyapeeth Demand Signals
              </h2>
            </div>
            <p className="text-[11px] text-gray-400 italic">
              Live observations from your campus, not predictions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Peak Hour */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
              <p className="text-xs font-semibold text-gray-500">Peak Campus Order Window</p>
              <p className="text-xl font-extrabold text-gray-900">
                {demandSummary?.peak?.label || '7:00 – 8:00 PM'}
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {demandSummary?.peak?.message || 'Hostel students place bulk evening grocery runs.'}
              </p>
            </div>

            {/* Top Products */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
              <p className="text-xs font-semibold text-gray-500">Top Pooled Items</p>
              {demandSummary?.topProducts && demandSummary.topProducts.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {demandSummary.topProducts.slice(0, 4).map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] font-medium text-gray-700">
                      {p.name} ({p.intents})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Milk, bread, snacks & oats</p>
              )}
            </div>

            {/* Pooling Opportunity */}
            <div className="p-4 rounded-2xl bg-primary-50/60 border border-primary-200 space-y-1">
              <p className="text-xs font-semibold text-primary-900">Live Pooling Opportunities</p>
              <p className="text-xl font-extrabold text-primary-950">
                {demandSummary?.opportunities?.length || 0} potential groups
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {demandSummary?.opportunities?.[0]?.message || 'Compatible intents in the same hostel can pool right now.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
