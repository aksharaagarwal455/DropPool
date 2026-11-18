import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext'
import BrandLogo from '../components/BrandLogo'

export default function AuthPage({ initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const { login, register, quickLogin, meta, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [hostel, setHostel] = useState('')
  const [block, setBlock] = useState('A')
  const [floor, setFloor] = useState('2')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const allowedDomains = meta?.collegeEmailDomains?.length
    ? meta.collegeEmailDomains.map((d) => `@${d}`).join(' or ')
    : '@banasthali.in'

  const hostelOptions = meta?.hostels?.length ? meta.hostels : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setLoading(true)

    try {
      if (isLogin) {
        const res = await login(email, password)
        if (res.success) {
          navigate(from, { replace: true })
        } else {
          setLocalError(res.error || 'Invalid email or password')
        }
      } else {
        const selectedHostel = hostel || hostelOptions[0]
        const res = await register({
          name,
          email,
          password,
          hostel: selectedHostel,
          block,
          floor,
        })
        if (res.success) {
          navigate(from, { replace: true })
        } else {
          setLocalError(res.error || 'Registration failed')
        }
      }
    } catch (err) {
      setLocalError(err?.message || 'Authentication error')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPersona = async (key) => {
    setLoading(true)
    setLocalError(null)
    const res = await quickLogin(key)
    setLoading(false)
    if (res.success) {
      navigate(from, { replace: true })
    } else {
      setLocalError(res.error || 'Failed to authenticate demo account')
    }
  }

  return (
    <Layout hidePromise meta={meta}>
      <div className="max-w-md mx-auto py-8">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo className="scale-110" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F3D1E] tracking-tight">
            {isLogin ? 'Sign in to DropPool' : 'Join Banasthali Vidyapeeth'}
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-2">
            {isLogin
              ? 'Campus demand pooling & cost optimization for hostel students.'
              : 'Create your account to pool delivery charges and save together.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#F0FDF4] p-1 rounded-2xl flex items-center mb-6 border border-[#BBF7D0]">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setLocalError(null) }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isLogin ? 'bg-white text-[#0F3D1E] shadow-xs' : 'text-[#475569] hover:text-[#0F3D1E]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setLocalError(null) }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isLogin ? 'bg-white text-[#0F3D1E] shadow-xs' : 'text-[#475569] hover:text-[#0F3D1E]'
            }`}
          >
            Create Account
          </button>
        </div>

        {(localError || authError) && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800">
            <p className="font-semibold">{localError || authError}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EBDD] shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-[#0F3D1E] mb-1.5">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-4 py-3 text-sm text-[#0F3D1E] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F3D1E] mb-1.5">
                Campus College Email
              </label>
              <input
                type="email"
                required
                placeholder={`student${allowedDomains.split(' ')[0]}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-4 py-3 text-sm text-[#0F3D1E] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Must end with: <span className="font-semibold text-[#15803D]">{allowedDomains}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D1E] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-4 py-3 text-sm text-[#0F3D1E] focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16]"
              />
            </div>

            {!isLogin && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D1E] mb-1">Hostel</label>
                  {hostelOptions.length > 0 ? (
                    <select
                      value={hostel || hostelOptions[0]}
                      onChange={(e) => setHostel(e.target.value)}
                      className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-3 py-2.5 text-xs font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    >
                      {hostelOptions.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Your hostel name"
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-3 py-2.5 text-xs font-medium text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D1E] mb-1">Block / Wing</label>
                    <input
                      type="text"
                      required
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      placeholder="e.g. A"
                      className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-3 py-2 text-xs text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D1E] mb-1">Floor</label>
                    <input
                      type="text"
                      required
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-[#F8FAF6] border border-[#E2EBDD] rounded-xl px-3 py-2 text-xs text-[#0F3D1E] focus:outline-none focus:border-[#84CC16]"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[#0F3D1E] hover:bg-[#165a2d] text-white text-sm font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Quick Demo Accounts (Real server sessions only) */}
          {meta?.demoMode && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#65A30D]">
                  Quick Demo Logins (Real Accounts)
                </p>
                <span className="text-[10px] text-gray-500">pass: demo-pass-123</span>
              </div>
              <p className="text-[11px] text-[#64748B] mb-3">
                Click any seeded student to log in directly via the server API:
              </p>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickPersona(p.key)}
                    className="p-2.5 rounded-xl border border-[#E2EBDD] bg-[#F8FAF6] hover:bg-[#F0FDF4] hover:border-[#84CC16] text-left transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-[#0F3D1E]">{p.name}</span>
                      <span className="text-[10px] font-semibold text-[#15803D]">{p.platform}</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] mt-0.5">{p.hostel} · {p.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
