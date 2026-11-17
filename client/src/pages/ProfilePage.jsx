import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import avatarAanya from '../assets/avatar_aanya.png'

export default function ProfilePage() {
  const { user, updateProfile, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user.name || 'Aanya Rao')
  const [hostel, setHostel] = useState(user.hostel || 'Hostel 8')
  const [campus, setCampus] = useState(user.campus || 'IIT Bombay')
  const [pickupPoint, setPickupPoint] = useState(user.preferences?.pickupLocation || 'Hostel 8 common room')
  const [selectedPlatform, setSelectedPlatform] = useState(user.preferences?.defaultPlatform || 'blinkit')
  const [windowPref, setWindowPref] = useState('Evenings · 7:00–7:30 pm')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSavedSuccess(false)
    await updateProfile({
      name: displayName,
      hostel,
      campus,
      preferences: {
        defaultPlatform: selectedPlatform,
        deliveryWindow: windowPref,
        pickupLocation: pickupPoint,
      },
    })
    setSaving(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <Layout>
      {/* Eyebrow & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          Your campus, your preferences
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
          {isAuthenticated ? 'Active profile' : 'Demo profile'}
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Hey, {displayName.split(' ')[0]}.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#64748B]">
          The small details that make your next pool a better fit.
        </p>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
          <span>✓ Preferences saved successfully!</span>
        </div>
      )}

      {/* Main Grid: Left (Dark Card) & Right (Campus details & Shopping preferences) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Dark Navy Card) */}
        <div className="lg:col-span-4">
          <div className="bg-[#13132B] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col items-start">
              <img
                src={user.profileImage || avatarAanya}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white/10 mb-4"
              />
              <h2 className="text-2xl font-bold text-white tracking-tight">{displayName}</h2>
              <p className="text-xs text-white/70 mt-0.5">{campus} · Undergraduate</p>

              <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90">
                {hostel}
              </span>
            </div>

            <div className="my-6 border-t border-white/10" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-extrabold text-[#10B981]">
                  ₹{user.stats?.totalSavings || 120}
                </p>
                <p className="text-xs text-white/60 mt-0.5">demo savings</p>
              </div>

              <div>
                <p className="text-3xl font-extrabold text-white">
                  {user.stats?.runsJoined ? `0${user.stats.runsJoined}` : '06'}
                </p>
                <p className="text-xs text-white/60 mt-0.5">example pools</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10">
              <p className="text-[11px] text-white/40">
                No identity verification is claimed.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Campus details & Shopping preferences) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            {/* Campus details Section */}
            <div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-5">Campus details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Campus</label>
                  <input
                    type="text"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Hostel</label>
                  <input
                    type="text"
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Usual pickup point</label>
                  <input
                    type="text"
                    value={pickupPoint}
                    onChange={(e) => setPickupPoint(e.target.value)}
                    className="w-full border-b border-gray-200 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Shopping preferences Section */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-bold text-[#0F172A] mb-4">Shopping preferences</h3>

              <div className="flex flex-wrap items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('blinkit')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    selectedPlatform === 'blinkit'
                      ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Blinkit
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlatform('zepto')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    selectedPlatform === 'zepto'
                      ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Zepto
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlatform('instamart')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    selectedPlatform === 'instamart'
                      ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Instamart
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Typical window</label>
                <input
                  type="text"
                  value={windowPref}
                  onChange={(e) => setWindowPref(e.target.value)}
                  className="w-full max-w-sm border-b border-gray-200 py-2 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-transparent"
                />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-[11px] text-[#94A3B8]">
                  Prefilled example preferences for this prototype.
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-xl hover:bg-[#4338CA] transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Reassurance Card */}
          <div className="bg-[#EEF2FF] rounded-3xl p-6 sm:p-7 border border-[#E0E7FF]">
            <h3 className="text-base font-bold text-[#0F172A]">A little less oversharing.</h3>
            <p className="text-xs sm:text-sm text-[#475569] mt-1 leading-relaxed">
              Only your name, hostel and shopping intent are shown to potential pool members.
            </p>
            <p className="text-xs font-bold text-[#4F46E5] mt-2">
              No payment details. No room number. No live location.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <button
              onClick={() => navigate('/intent')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow"
            >
              <span>Create an intent with these preferences</span>
              <span className="ml-2 font-bold text-base">→</span>
            </button>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-[#0F172A] text-sm font-semibold border border-gray-200 transition-colors shadow-2xs"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
