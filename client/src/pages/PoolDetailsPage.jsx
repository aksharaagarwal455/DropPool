import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import Layout from '../components/Layout'
import { Api, errorMessage } from '../lib/api'
import { formatPaise, rupeesToPaise } from '../lib/money'
import { useAuth } from '../context/AuthContext'

const STEP_DEFINITIONS = [
  { key: 'proposed', title: '1. Forming', desc: 'Confirming members' },
  { key: 'confirmed', title: '2. Confirmed', desc: 'Host ordering' },
  { key: 'awaiting_payments', title: '3. Payments', desc: 'Transferring shares' },
  { key: 'payments_confirmed', title: '4. Paid', desc: 'All shares confirmed' },
  { key: 'order_placed', title: '5. In Transit', desc: 'Order placed externally' },
  { key: 'ready_for_pickup', title: '6. Pickup', desc: 'Ready at hostel' },
  { key: 'completed', title: '7. Done', desc: 'Run completed' },
]

function getStepIndex(status) {
  const idx = STEP_DEFINITIONS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

export default function PoolDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // State for pool list mode (/pools)
  const [poolsList, setPoolsList] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')

  // State for single pool mode (/pools/:id)
  const [pool, setPool] = useState(null)
  const [loadingPool, setLoadingPool] = useState(true)
  const [poolError, setPoolError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // QR code data URL
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Form states
  const [actualTotalRupees, setActualTotalRupees] = useState('')
  const [utrInput, setUtrInput] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)

  // Modals
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupEta, setPickupEta] = useState('')

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelNote, setCancelNote] = useState('')

  const [rejectingPaymentId, setRejectingPaymentId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const isMountedRef = useRef(true)

  // Fetch list of pools if no ID is in URL
  const fetchPoolsList = useCallback(async () => {
    setLoadingList(true)
    setListError('')
    try {
      const data = await Api.pools.mine()
      const pools = Array.isArray(data) ? data : data?.pools || []
      if (isMountedRef.current) setPoolsList(pools)
    } catch (err) {
      if (isMountedRef.current) setListError(errorMessage(err))
    } finally {
      if (isMountedRef.current) setLoadingList(false)
    }
  }, [])

  // Fetch single pool by ID
  const fetchPool = useCallback(async (isPolling = false) => {
    if (!id) return
    if (!isPolling) setActionError('')
    try {
      const data = await Api.pools.get(id)
      if (isMountedRef.current) {
        setPool(data)
        setPoolError('')
        // Generate QR code if upiUri exists
        if (data.myPayment?.upiUri) {
          QRCode.toDataURL(data.myPayment.upiUri, { width: 190, margin: 1 })
            .then((url) => {
              if (isMountedRef.current) setQrDataUrl(url)
            })
            .catch(() => {
              if (isMountedRef.current) setQrDataUrl('')
            })
        } else {
          setQrDataUrl('')
        }
      }
    } catch (err) {
      if (isMountedRef.current && !isPolling) {
        setPoolError(errorMessage(err))
      }
    } finally {
      if (isMountedRef.current && !isPolling) {
        setLoadingPool(false)
      }
    }
  }, [id])

  useEffect(() => {
    isMountedRef.current = true
    if (!id) {
      fetchPoolsList()
    } else {
      setLoadingPool(true)
      fetchPool()

      // Polling every 10 seconds
      const interval = setInterval(() => {
        fetchPool(true)
      }, 10000)

      // Window focus handler
      const handleFocus = () => {
        fetchPool(true)
      }
      window.addEventListener('focus', handleFocus)

      return () => {
        isMountedRef.current = false
        clearInterval(interval)
        window.removeEventListener('focus', handleFocus)
      }
    }
    return () => {
      isMountedRef.current = false
    }
  }, [id, fetchPoolsList, fetchPool])

  // Member Action: Confirm membership
  async function handleConfirmMembership() {
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await Api.pools.confirm(pool.id)
      setPool(updated)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Member Action: Leave pool
  async function handleLeavePool() {
    if (!window.confirm('Are you sure you want to leave this pool? This may cancel or recalculate the pool for other students.')) {
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await Api.pools.leave(pool.id)
      setPool(updated)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Host Action: Record actual checkout total
  async function handleRecordActualTotal(e) {
    e.preventDefault()
    setActionError('')
    const rupees = parseFloat(actualTotalRupees)
    if (isNaN(rupees) || rupees <= 0) {
      setActionError('Enter a valid checkout total in rupees.')
      return
    }
    setActionLoading(true)
    try {
      const paise = rupeesToPaise(rupees)
      const updated = await Api.pools.actualTotal(pool.id, paise)
      setPool(updated)
      setActualTotalRupees('')
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Host Action: Status Transition
  async function handleHostTransition(toStatus, extraData = {}) {
    setActionLoading(true)
    setActionError('')
    try {
      const updated = await Api.pools.status(pool.id, { to: toStatus, ...extraData })
      setPool(updated)
      setShowPickupModal(false)
      setShowCancelModal(false)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Member Action: Claim payment with UTR
  async function handleClaimPayment(e) {
    e.preventDefault()
    if (!pool.myPayment) return
    const cleanUtr = utrInput.trim()
    if (cleanUtr && !/^[A-Za-z0-9]{6,30}$/.test(cleanUtr)) {
      setActionError('Transaction reference (UTR) must be 6 to 30 letters or digits.')
      return
    }
    setClaimLoading(true)
    setActionError('')
    try {
      await Api.payments.claim(pool.myPayment.id, cleanUtr)
      setUtrInput('')
      await fetchPool()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setClaimLoading(false)
    }
  }

  // Host Action: Confirm Payment
  async function handleConfirmPayment(paymentId) {
    setActionLoading(true)
    setActionError('')
    try {
      await Api.payments.confirm(paymentId)
      await fetchPool()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Host Action: Reject Payment
  async function handleRejectPayment(e) {
    e.preventDefault()
    if (!rejectingPaymentId) return
    setActionLoading(true)
    setActionError('')
    try {
      await Api.payments.reject(rejectingPaymentId, rejectReason.trim())
      setRejectingPaymentId(null)
      setRejectReason('')
      await fetchPool()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Host Action: Mark Refunded
  async function handleRefundPayment(paymentId) {
    setActionLoading(true)
    setActionError('')
    try {
      await Api.payments.refund(paymentId)
      await fetchPool()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  // Helper status color
  function getStatusBadge(status) {
    switch (status) {
      case 'proposed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Forming Pool</span>
      case 'confirmed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">All Confirmed</span>
      case 'awaiting_payments':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Awaiting Payments</span>
      case 'payments_confirmed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Payments Confirmed</span>
      case 'order_placed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">Order Placed</span>
      case 'ready_for_pickup':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-300">Ready for Pickup</span>
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Completed</span>
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Cancelled</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>
    }
  }

  // -------------------------------------------------------------
  // LIST MODE: If on /pools, show list of user's pools
  // -------------------------------------------------------------
  if (!id) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-800">
                Active & Past Groups
              </p>
              <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                My <span className="highlight-lime">DropPools</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Collaborative delivery groups you host or joined at Banasthali Vidyapeeth.
              </p>
            </div>
            <Link
              to="/intent"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-sm shadow-xs transition-colors"
            >
              + Create Shopping Intent
            </Link>
          </div>

          {loadingList ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-2xs">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-800 border-t-transparent" />
              <p className="text-sm text-gray-500 mt-3 font-medium">Loading your pools...</p>
            </div>
          ) : listError ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {listError}
            </div>
          ) : poolsList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mx-auto text-2xl font-bold">
                🛒
              </div>
              <h2 className="text-lg font-bold text-gray-900">No pools joined yet</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Create a shopping intent to match with hostel peers and pool your small cart.
              </p>
              <Link
                to="/intent"
                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-sm transition-colors"
              >
                Start an Intent
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {poolsList.map((p) => (
                <Link
                  key={p.id}
                  to={`/pools/${p.id}`}
                  className="bg-white hover:bg-primary-50/30 rounded-3xl p-6 border border-gray-200 hover:border-primary-300 transition-all shadow-2xs flex flex-col justify-between space-y-4"
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
                    {getStatusBadge(p.status)}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Your Share</p>
                      <p className="text-base font-extrabold text-primary-900">
                        {p.mySharePaise ? formatPaise(p.mySharePaise) : 'Calculating'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary-800 flex items-center gap-1">
                      View Group →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // -------------------------------------------------------------
  // DETAIL MODE: If /pools/:id
  // -------------------------------------------------------------
  if (loadingPool) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-800 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500 mt-4">Loading pool details...</p>
        </div>
      </Layout>
    )
  }

  if (poolError || !pool) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-red-700">
            <h2 className="text-lg font-bold">Could not load pool</h2>
            <p className="text-sm mt-1">{poolError || 'Pool not found or you are not a member.'}</p>
          </div>
          <Link
            to="/pools"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-primary-800 text-white font-semibold text-sm"
          >
            ← Back to My Pools
          </Link>
        </div>
      </Layout>
    )
  }

  const currentStepIdx = getStepIndex(pool.status)
  const isCancelled = pool.status === 'cancelled'

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Navigation & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-800">
            <Link to="/pools" className="hover:underline">Pools</Link>
            <span>/</span>
            <span>{pool.code}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(pool.status)}
            {pool.isDemo && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                Demo
              </span>
            )}
          </div>
        </div>

        {/* Title & Pool Metadata */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Shared Run <span className="highlight-lime">{pool.code}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">
              <span className="capitalize font-semibold text-gray-900">{pool.platform}</span> · {pool.hostel} {pool.block ? `(${pool.block})` : ''} · Host: <strong className="text-primary-900">{pool.hostName}</strong> {pool.isHost ? '(You)' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPool()}
              title="Refresh status"
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              🔄 Refresh
            </button>
            <Link
              to="/optimizer"
              state={{ poolId: pool.id, optimization: pool.optimization }}
              className="px-4 py-2 rounded-xl bg-primary-50 border border-primary-200 text-xs font-bold text-primary-900 hover:bg-primary-100 transition-colors shadow-2xs"
            >
              📊 Cost Optimizer
            </Link>
          </div>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Server Warnings Banner */}
        {pool.warnings && pool.warnings.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium space-y-1">
            <p className="font-bold uppercase tracking-wider text-[11px] text-amber-900">Notice:</p>
            {pool.warnings.map((w, idx) => (
              <p key={idx}>• {w}</p>
            ))}
          </div>
        )}

        {/* Stepper Progress Bar Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-2xs">
          {isCancelled ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-900">Pool Cancelled</h2>
              <p className="text-xs mt-1">This pool was cancelled. Associated shopping intents have been released back to active.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {STEP_DEFINITIONS.map((st, i) => {
                  const isCompleted = currentStepIdx > i
                  const isCurrent = currentStepIdx === i
                  return (
                    <div key={st.key} className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-primary-800 text-white'
                              : isCurrent
                              ? 'bg-primary-800 text-white ring-4 ring-primary-300'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                        >
                          {isCompleted ? '✓' : i + 1}
                        </div>
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-primary-900' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                          {st.title}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-500 pl-8 hidden sm:block truncate">{st.desc}</p>
                    </div>
                  )
                })}
              </div>

              {/* Progress track */}
              <div className="mt-5 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-800 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, ((currentStepIdx + 1) / STEP_DEFINITIONS.length) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Member Action Bar (Confirm or Leave) */}
        {(pool.actions?.canConfirm || pool.actions?.canLeave) && !isCancelled && (
          <div className="bg-primary-50 border border-primary-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-900">
                Participation Status
              </p>
              <p className="text-xs text-primary-800 mt-0.5">
                {pool.actions?.canConfirm
                  ? 'Confirm your membership to verify your items and signal readiness.'
                  : 'You have confirmed your participation.'}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {pool.actions?.canConfirm && (
                <button
                  onClick={handleConfirmMembership}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-sm shadow-xs transition-colors"
                >
                  {actionLoading ? 'Confirming...' : '✓ Confirm Membership'}
                </button>
              )}
              {pool.actions?.canLeave && (
                <button
                  onClick={handleLeavePool}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-red-300 text-red-600 font-semibold text-xs transition-colors shadow-2xs"
                >
                  Leave Pool
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pickup Notice Card */}
        {pool.pickup?.location && (
          <div className="bg-white rounded-3xl p-6 border-2 border-primary-800/30 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-100 text-primary-900">
                📍 Hostel Pickup Ready
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 mt-1">
                Collect at {pool.pickup.location}
              </h2>
              {pool.pickup.eta && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Estimated pickup: <strong>{new Date(pool.pickup.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 max-w-xs text-right">
              Bring your student ID or verification when meeting the host.
            </p>
          </div>
        )}

        {/* Main Grid: Left (Items + Totals) & Right (Payments & Host Controls) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cart items & Optimization summary */}
          <div className="lg:col-span-7 space-y-6">
            {/* Items Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-2xs">
              <h2 className="text-xl font-bold text-gray-900">Pool Cart Items</h2>
              <p className="text-xs text-gray-500 mt-0.5 mb-5">
                Every member's individual cart aggregated into a single platform run.
              </p>

              <div className="divide-y divide-gray-100 space-y-4">
                {pool.members.map((m) => (
                  <div key={m.userId} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{m.name}</span>
                        {m.isHost && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-800 text-white">
                            Host
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          ({m.hostel} {m.block ? `· ${m.block}` : ''})
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        m.confirmed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {m.confirmed ? '✓ Confirmed' : 'Waiting confirmation'}
                      </span>
                    </div>

                    <div className="space-y-2 pl-3 border-l-2 border-gray-100">
                      {m.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">
                            {item.name} <span className="text-gray-400">× {item.qty}</span>
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatPaise(item.unitPricePaise * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 text-xs font-semibold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl">
                      <span className="text-gray-500 font-normal">Subtotal + Estimated Share:</span>
                      <span>{formatPaise(m.finalSharePaise ?? m.estimatedSharePaise)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total demo / actual cost card */}
            <div className="bg-primary-50 rounded-3xl p-6 border border-primary-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">
                    {pool.actualTotalPaise ? 'Recorded External Checkout Total' : 'Estimated Combined Run Total'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pool.feeProfileIsIllustrative ? 'Based on illustrative platform fees' : 'Based on configured fees'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-primary-950">
                    {formatPaise(pool.actualTotalPaise ?? pool.optimization.pooledTotalPaise)}
                  </span>
                </div>
              </div>
              {pool.extraChargesPaise > 0 && (
                <p className="text-xs text-amber-800 pt-2 border-t border-primary-200">
                  Includes {formatPaise(pool.extraChargesPaise)} in additional charges recorded by the host.
                </p>
              )}
            </div>

            {/* History Timeline */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-2xs">
              <h2 className="text-base font-bold text-gray-900 mb-4">Run Timeline & Audit Log</h2>
              <div className="space-y-3">
                {pool.history?.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary-800 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 capitalize">{h.status.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {h.note && <p className="text-gray-600 mt-0.5">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Member Payments, Host Controls, Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Member Payment Card (Only visible if viewer owes money / has myPayment) */}
            {pool.myPayment && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-primary-800 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-800">
                      Your Payment Share
                    </span>
                    <h2 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                      {formatPaise(pool.myPayment.amountPaise)}
                    </h2>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                    pool.myPayment.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : pool.myPayment.status === 'claimed'
                      ? 'bg-blue-100 text-blue-800'
                      : pool.myPayment.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {pool.myPayment.status}
                  </span>
                </div>

                {/* QR Code and UPI App Trigger */}
                {['pending', 'rejected'].includes(pool.myPayment.status) && (
                  <div className="space-y-4">
                    {qrDataUrl ? (
                      <div className="flex flex-col items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <img src={qrDataUrl} alt="UPI QR Code" className="w-44 h-44 rounded-xl shadow-2xs" />
                        <p className="text-[11px] text-gray-500 mt-2">Scan with GPay / PhonePe / Paytm</p>
                        {pool.myPayment.upiUri && (
                          <a
                            href={pool.myPayment.upiUri}
                            className="mt-2.5 inline-flex items-center text-xs font-bold text-primary-800 hover:text-primary-900 underline"
                          >
                            Open in UPI App →
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
                        The host has not linked their UPI ID yet. Coordinate payment with the host directly.
                      </div>
                    )}

                    {pool.myPayment.rejectReason && (
                      <div className="p-3 bg-red-50 rounded-xl text-xs text-red-700">
                        <strong>Previous Claim Rejected:</strong> {pool.myPayment.rejectReason}
                      </div>
                    )}

                    {/* UTR Claim Form */}
                    <form onSubmit={handleClaimPayment} className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-gray-700">
                        Transaction Ref / UTR
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={utrInput}
                          onChange={(e) => setUtrInput(e.target.value)}
                          placeholder="e.g. 408129841029"
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-primary-800 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={claimLoading}
                          className="px-4 py-2 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-xs transition-colors shrink-0"
                        >
                          {claimLoading ? 'Claiming...' : 'Submit Claim'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Enter the 6-30 character reference from your UPI payment receipt.
                      </p>
                    </form>
                  </div>
                )}

                {pool.myPayment.status === 'claimed' && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                    <p className="font-bold">✓ Payment Claim Submitted</p>
                    <p>Reference (UTR): <span className="font-mono">{pool.myPayment.utr || 'None provided'}</span></p>
                    <p className="text-[11px] text-blue-700">Waiting for host to verify and confirm receipt.</p>
                  </div>
                )}

                {pool.myPayment.status === 'confirmed' && (
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-xs text-green-900 space-y-1">
                    <p className="font-bold">✓ Share Confirmed by Host</p>
                    <p>Your contribution has been settled.</p>
                  </div>
                )}

                {/* Verbatim Server Notice */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[11px] text-gray-500 italic leading-relaxed">
                    "{pool.paymentNotice}"
                  </p>
                </div>
              </div>
            )}

            {/* Host Controls Card (Only visible to host) */}
            {pool.isHost && !isCancelled && (
              <div className="bg-primary-900 text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary-300">
                      Host Operations
                    </span>
                    <h2 className="text-xl font-bold mt-0.5">Order & Contributions</h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-800 text-primary-100">
                    Host View
                  </span>
                </div>

                {/* 1. Record Actual Total (When status is confirmed) */}
                {pool.actions?.canRecordTotal && (
                  <div className="space-y-3 pt-2">
                    <div className="bg-primary-800/80 p-4 rounded-2xl border border-primary-700 space-y-2">
                      <p className="text-xs font-bold text-primary-100">
                        Step: Place Order Externally & Record Total
                      </p>
                      <p className="text-xs text-primary-200 leading-relaxed">
                        Place the order on {pool.platform} for all member items. Once placed, enter the exact final checkout amount charged.
                      </p>

                      {!user?.hasUpiId && (
                        <div className="p-3 rounded-xl bg-amber-400 text-amber-950 text-xs font-medium space-y-1">
                          <p className="font-bold">⚠️ UPI ID Required</p>
                          <p>Add your UPI ID in your Profile before recording total so members can pay you.</p>
                          <Link to="/profile" className="inline-block mt-1 font-bold underline">
                            Go to Profile →
                          </Link>
                        </div>
                      )}

                      <form onSubmit={handleRecordActualTotal} className="space-y-2 pt-2">
                        <label className="block text-xs font-medium text-primary-100">
                          External Checkout Total (₹)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={actualTotalRupees}
                            onChange={(e) => setActualTotalRupees(e.target.value)}
                            placeholder="e.g. 330.00"
                            className="flex-1 px-3 py-2 rounded-xl bg-primary-950 border border-primary-700 text-white text-xs focus:ring-2 focus:ring-primary-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={actionLoading || !user?.hasUpiId}
                            className="px-4 py-2 rounded-xl bg-primary-400 hover:bg-primary-300 text-primary-950 font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
                          >
                            Lock & Bill Shares
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* 2. Payment Verification Table */}
                {pool.payments && pool.payments.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-primary-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-primary-100">Member Contributions</h3>
                      <span className="text-xs text-primary-300">
                        {pool.actions?.allPaymentsConfirmed ? '✓ All Settled' : 'Awaiting confirmation'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {pool.payments.map((p) => (
                        <div key={p.id} className="bg-primary-800/70 p-3 rounded-xl border border-primary-700 text-xs flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{p.name}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-950 text-primary-300">
                                {p.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-primary-300 mt-0.5">
                              {formatPaise(p.amountPaise)} {p.utr ? `· UTR: ${p.utr}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {p.status === 'claimed' && (
                              <>
                                <button
                                  onClick={() => handleConfirmPayment(p.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded-lg bg-green-500 hover:bg-green-400 text-primary-950 font-bold text-[11px] transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setRejectingPaymentId(p.id)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-semibold text-[11px] transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {p.status === 'confirmed' && pool.status === 'cancelled' && (
                              <button
                                onClick={() => handleRefundPayment(p.id)}
                                disabled={actionLoading}
                                className="px-2 py-1 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold text-[11px]"
                              >
                                Refund
                              </button>
                            )}
                            {p.status === 'confirmed' && pool.status !== 'cancelled' && (
                              <span className="text-xs text-green-300 font-bold">✓ Received</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Next Host Transitions */}
                {pool.actions?.nextHostStatus && (
                  <div className="space-y-3 pt-3 border-t border-primary-800">
                    <p className="text-xs font-bold text-primary-200 uppercase tracking-wider">Next Step</p>

                    {pool.actions.nextHostStatus === 'order_placed' && (
                      <button
                        onClick={() => handleHostTransition('order_placed')}
                        disabled={actionLoading}
                        className="w-full py-3 rounded-xl bg-primary-400 hover:bg-primary-300 text-primary-950 font-bold text-sm transition-colors shadow-xs"
                      >
                        {actionLoading ? 'Updating...' : '🛍️ Mark Order Placed Externally'}
                      </button>
                    )}

                    {pool.actions.nextHostStatus === 'ready_for_pickup' && (
                      <button
                        onClick={() => setShowPickupModal(true)}
                        disabled={actionLoading}
                        className="w-full py-3 rounded-xl bg-primary-400 hover:bg-primary-300 text-primary-950 font-bold text-sm transition-colors shadow-xs"
                      >
                        📍 Mark Ready for Hostel Pickup
                      </button>
                    )}

                    {pool.actions.nextHostStatus === 'completed' && (
                      <button
                        onClick={() => handleHostTransition('completed')}
                        disabled={actionLoading}
                        className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-primary-950 font-bold text-sm transition-colors shadow-xs"
                      >
                        ✓ Mark Pool Run Completed
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Host Cancel Pool */}
                {pool.actions?.canCancel && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={actionLoading}
                      className="w-full py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold transition-colors"
                    >
                      Cancel Pool Run
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Links / Disclaimers */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs space-y-3 text-xs text-gray-500">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                DropPool Safety & Integrity
              </p>
              <p>
                DropPool coordinates demand intelligence and optimizes cart split math. All payments are transferred peer-to-peer using standard UPI.
              </p>
              <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                Illustrative fees, not verified current platform pricing.
              </p>
            </div>
          </div>
        </div>

        {/* ----------------- MODALS ----------------- */}
        {/* Pickup Modal */}
        {showPickupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900">Hostel Pickup Details</h2>
              <p className="text-xs text-gray-500">
                Specify where in the hostel peers can meet you to collect their delivery.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Pickup Location * (e.g. Gargi A Common Room)
                  </label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="Hostel lobby, Room 204, Common room"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-primary-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Estimated Time (ETA)
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupEta}
                    onChange={(e) => setPickupEta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-primary-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pickupLocation.trim()) {
                      alert('Pickup location is required.')
                      return
                    }
                    handleHostTransition('ready_for_pickup', {
                      pickupLocation: pickupLocation.trim(),
                      eta: pickupEta || undefined,
                    })
                  }}
                  disabled={actionLoading || !pickupLocation.trim()}
                  className="px-5 py-2 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-xs disabled:opacity-50"
                >
                  Notify Members
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-red-700">Cancel Pool Run</h2>
              <p className="text-xs text-gray-500">
                Are you sure you want to cancel this pool? All participating intents will be released back to active, and any pending shares will be cancelled.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for cancellation *
                </label>
                <input
                  type="text"
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="e.g. Items out of stock on platform"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!cancelNote.trim()) {
                      alert('A cancellation note is required.')
                      return
                    }
                    handleHostTransition('cancelled', { note: cancelNote.trim() })
                  }}
                  disabled={actionLoading || !cancelNote.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Payment Modal */}
        {rejectingPaymentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form onSubmit={handleRejectPayment} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-gray-900">Reject Member Payment</h2>
              <p className="text-xs text-gray-500">
                Specify why this payment claim is being rejected (e.g. UTR not found in your bank statement).
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Payment not received in bank account"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-primary-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingPaymentId(null)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  Reject Payment
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  )
}
