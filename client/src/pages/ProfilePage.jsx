import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { Api, errorMessage } from '../lib/api'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()

  // Form states initialized from user
  const [name, setName] = useState(user?.name || '')
  const [hostel, setHostel] = useState(user?.hostel || '')
  const [block, setBlock] = useState(user?.block || '')
  const [floor, setFloor] = useState(user?.floor || '')
  const [upiId, setUpiId] = useState('')
  const [confirmedPaymentsCount, setConfirmedPaymentsCount] = useState(0)

  const [hostelsList, setHostelsList] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setHostel(user.hostel || '')
      setBlock(user.block || '')
      setFloor(user.floor || '')
    }
  }, [user])

  useEffect(() => {
    Api.meta()
      .then((data) => {
        if (data?.hostels && data.hostels.length > 0) {
          setHostelsList(data.hostels)
        }
      })
      .catch(() => {})

    Api.payments.mine()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.payments || []
        const confirmed = list.filter((p) => p.status === 'confirmed').length
        setConfirmedPaymentsCount(confirmed)
      })
      .catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess('')
    setSaveError('')

    const payload = {
      name: name.trim(),
      hostel: hostel.trim(),
      block: block.trim(),
      floor: floor.trim(),
    }

    // Only include upiId if user entered something or explicitly wants to set it
    if (upiId.trim()) {
      payload.upiId = upiId.trim()
    }

    try {
      const res = await updateProfile(payload)
      if (res?.success) {
        setSaveSuccess('Profile updated successfully!')
        setUpiId('')
        setTimeout(() => setSaveSuccess(''), 4000)
      } else {
        setSaveError(res?.error || 'Failed to update profile.')
      }
    } catch (err) {
      setSaveError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleClearUpi() {
    if (!window.confirm('Clear your UPI ID? You will not be able to host pools until you add a UPI ID.')) {
      return
    }
    setSaving(true)
    setSaveSuccess('')
    setSaveError('')
    try {
      const res = await updateProfile({ upiId: '' })
      if (res?.success) {
        setSaveSuccess('UPI ID cleared.')
        setUpiId('')
        setTimeout(() => setSaveSuccess(''), 4000)
      }
    } catch (err) {
      setSaveError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-800">
              Campus Profile & Settings
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mt-1">
              Hey, <span className="highlight-lime">{user?.name ? user.name.split(' ')[0] : 'Student'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Manage your hostel delivery room, UPI receipt ID, and campus trust credentials.
            </p>
          </div>
          <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-900 border border-primary-200 capitalize">
            {user?.role || 'Student'} · {user?.isDemo ? 'Demo Mode' : 'Verified'}
          </span>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 font-semibold flex items-center justify-between">
            <span>✓ {saveSuccess}</span>
            <button onClick={() => setSaveSuccess('')} className="text-emerald-700 ml-2">✕</button>
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-semibold flex items-center justify-between">
            <span>{saveError}</span>
            <button onClick={() => setSaveError('')} className="text-red-600 ml-2">✕</button>
          </div>
        )}

        {/* Main Grid: Profile Form & Trust Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Edit Form */}
          <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xs space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Your Campus Details</h2>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-800 focus:outline-none"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  College Email <span className="text-gray-400 font-normal">(Read-only)</span>
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Campus identity authenticated with college domain.
                </p>
              </div>

              {/* Hostel */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Hostel
                </label>
                {hostelsList.length > 0 ? (
                  <select
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-800 focus:outline-none bg-white"
                  >
                    <option value="">Select your hostel...</option>
                    {hostelsList.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    placeholder="Your hostel name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-800 focus:outline-none"
                  />
                )}
              </div>

              {/* Block & Floor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Block / Wing
                  </label>
                  <input
                    type="text"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    placeholder="e.g. Block A"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Floor / Room
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. 2nd Floor, Room 204"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* UPI ID Section */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Host UPI ID (for receiving peer shares)
                  </label>
                  {user?.hasUpiId ? (
                    <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      ✓ Active: {user.upiIdMasked}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Required to host pools
                    </span>
                  )}
                </div>

                {!user?.hasUpiId && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    💡 <strong>Hosting pools requires a UPI ID</strong> so other students can send you their share via UPI QR or deep link. If you only plan to join pools hosted by peers, a UPI ID is optional.
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder={user?.hasUpiId ? 'Enter new UPI ID to replace...' : 'e.g. student@okhdfcbank'}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary-800 focus:outline-none"
                  />
                  {user?.hasUpiId && (
                    <button
                      type="button"
                      onClick={handleClearUpi}
                      disabled={saving}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-red-600 hover:text-red-700 font-semibold text-xs transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Required if you host pools. DropPool never exposes your raw UPI ID publicly; members receive payment deep links only during active pool settlements.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white font-bold text-sm shadow-xs transition-all hover:shadow disabled:opacity-50"
                >
                  {saving ? 'Saving changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Trust Stats & Security Card */}
          <div className="md:col-span-5 space-y-6">
            {/* Trust Metrics Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-2xs space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-900">
                Integrity & Peer Reliability
              </span>
              <h3 className="text-xl font-bold text-gray-900">Campus Trust Metrics</h3>
              <p className="text-xs text-gray-500">
                Transparent numbers derived from your actual platform run activity.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="text-gray-600 font-medium">Completed Pool Runs</span>
                  <span className="text-base font-extrabold text-primary-900">
                    {user?.trust?.completedPools ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="text-gray-600 font-medium">Cancelled Runs</span>
                  <span className="text-base font-extrabold text-gray-700">
                    {user?.trust?.cancelledPools ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="text-gray-600 font-medium">Confirmed UPI Contributions</span>
                  <span className="text-base font-extrabold text-green-700">
                    {confirmedPaymentsCount}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic pt-2 border-t border-gray-100">
                DropPool uses real participation counts, never simulated star ratings.
              </p>
            </div>

            {/* Campus Context & Safety Notice */}
            <div className="bg-primary-900 text-white rounded-3xl p-6 sm:p-7 shadow-2xs space-y-3">
              <h4 className="text-sm font-bold text-primary-200 uppercase tracking-wider">
                Banasthali Vidyapeeth
              </h4>
              <p className="text-xs text-primary-100 leading-relaxed">
                Orders are pooled exclusively with students within your verified college domain. Pickup coordination occurs in designated hostel common areas.
              </p>
              <div className="pt-2 border-t border-primary-800 text-[11px] text-primary-300">
                Illustrative fees, not verified current platform pricing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
