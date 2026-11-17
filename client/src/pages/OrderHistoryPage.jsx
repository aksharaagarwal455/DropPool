import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { Api, errorMessage } from '../lib/api'
import { formatPaise } from '../lib/money'

export default function OrderHistoryPage() {
  const [pools, setPools] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('pools') // 'pools' | 'payments'

  const isMountedRef = useRef(true)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [poolsRes, paymentsRes] = await Promise.allSettled([
        Api.pools.mine(),
        Api.payments.mine(),
      ])

      if (!isMountedRef.current) return

      if (poolsRes.status === 'fulfilled') {
        const pList = Array.isArray(poolsRes.value) ? poolsRes.value : poolsRes.value?.pools || []
        // Filter by completed or cancelled
        setPools(pList.filter((p) => ['completed', 'cancelled'].includes(p.status)))
      }

      if (paymentsRes.status === 'fulfilled') {
        const payList = Array.isArray(paymentsRes.value) ? paymentsRes.value : paymentsRes.value?.payments || []
        setPayments(payList)
      }
    } catch (err) {
      if (isMountedRef.current) setError(errorMessage(err))
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadHistory()
    return () => {
      isMountedRef.current = false
    }
  }, [loadHistory])

  // Calculate cumulative real savings from completed pools
  const completedPools = pools.filter((p) => p.status === 'completed')
  const totalSavingsPaise = completedPools.reduce((acc, p) => {
    if (typeof p.savingsPaise === 'number' && p.savingsPaise > 0) {
      return acc + p.savingsPaise
    }
    return acc
  }, 0)

  function getStatusPill(status) {
    switch (status) {
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">Completed Run</span>
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">Cancelled</span>
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">Confirmed</span>
      case 'claimed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">Claimed</span>
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800">Pending</span>
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700">Rejected</span>
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Refunded</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>
    }
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Eyebrow */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-800">
            Campus Cart Archive
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-900 border border-primary-200">
            Real order & contribution records
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Order <span className="highlight-lime">History</span> & Settlements
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Audit trail of your completed runs, savings, and peer UPI contributions.
            </p>
          </div>

          {/* Cumulative Savings Card */}
          <div className="bg-primary-50 border border-primary-200 rounded-2xl px-5 py-3 shadow-2xs text-right shrink-0">
            <p className="text-[11px] font-semibold text-primary-800 uppercase tracking-wider">
              Total Verified Savings
            </p>
            <p className="text-2xl font-extrabold text-primary-950">
              {formatPaise(totalSavingsPaise)}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab('pools')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'pools'
                ? 'bg-primary-800 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Past Pools ({pools.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'payments'
                ? 'bg-primary-800 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Payment Claims ({payments.length})
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-2xs">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-800 border-t-transparent" />
            <p className="text-sm text-gray-500 mt-3 font-medium">Loading history records...</p>
          </div>
        ) : activeTab === 'pools' ? (
          pools.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-800 flex items-center justify-center mx-auto text-xl font-bold">
                📋
              </div>
              <h2 className="text-base font-bold text-gray-900">No completed pools yet</h2>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Your savings will show up here after your first completed run.
              </p>
              <div className="pt-2">
                <Link
                  to="/intent"
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-semibold text-xs"
                >
                  Create Shopping Intent
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pools.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-gray-900">{p.code}</span>
                      <span className="capitalize text-xs font-bold text-gray-600 px-2.5 py-0.5 rounded-full bg-gray-100">
                        {p.platform}
                      </span>
                      {getStatusPill(p.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · {p.memberCount} members · {p.isHost ? 'You Hosted' : 'Member'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">Your Share</p>
                      <p className="text-base font-extrabold text-gray-900">
                        {p.mySharePaise ? formatPaise(p.mySharePaise) : '—'}
                      </p>
                    </div>

                    {typeof p.savingsPaise === 'number' && p.savingsPaise > 0 && (
                      <div>
                        <p className="text-[11px] text-primary-800 font-medium">Net Saved</p>
                        <p className="text-base font-extrabold text-primary-900">
                          +{formatPaise(p.savingsPaise)}
                        </p>
                      </div>
                    )}

                    <Link
                      to={`/pools/${p.id}`}
                      className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-800 transition-colors"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Payment Claims Tab */
          payments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-2xs space-y-3">
              <h2 className="text-base font-bold text-gray-900">No payment records found</h2>
              <p className="text-xs text-gray-500">
                Peer UPI payment claims for shared runs will be listed here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Pool Reference</th>
                      <th className="px-6 py-3.5">Amount</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Transaction Ref (UTR)</th>
                      <th className="px-6 py-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          <Link to={`/pools/${pay.poolId}`} className="text-primary-800 hover:underline">
                            View Pool
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-gray-900">
                          {formatPaise(pay.amountPaise)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusPill(pay.status)}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-600">
                          {pay.utr || '—'}
                          {pay.rejectReason && (
                            <span className="block text-[10px] text-red-600 font-sans mt-0.5">
                              Rejected: {pay.rejectReason}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/pools/${pay.poolId}`}
                            className="text-primary-800 font-bold hover:underline"
                          >
                            Pool Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-400">
            Illustrative fees, not verified current platform pricing. All transfers occur peer-to-peer via UPI.
          </p>
        </div>
      </div>
    </Layout>
  )
}
