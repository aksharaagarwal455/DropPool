import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth, DEMO_USERS } from '../context/AuthContext'
import logoImg from '../assets/logo.png'

export default function AuthPage({ initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const { login, register, switchDemoUser } = useAuth()
  const navigate = useNavigate()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [hostel, setHostel] = useState('Hostel 8')
  const [block, setBlock] = useState('A')
  const [floor, setFloor] = useState('3')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (isLogin) {
        const res = await login(email, password)
        if (res.success) {
          navigate('/')
        } else {
          setError(res.error || 'Invalid email or password')
        }
      } else {
        const res = await register({
          name,
          email,
          password,
          hostel,
          block,
          floor,
        })
        if (res.success) {
          navigate('/')
        } else {
          setError(res.error || 'Registration failed')
        }
      }
    } catch (err) {
      setError(err?.message || 'Authentication error')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = (userKey) => {
    switchDemoUser(userKey)
    setInfo(`Switched active persona to ${DEMO_USERS[userKey]?.name}!`)
    setTimeout(() => navigate('/'), 600)
  }

  return (
    <Layout hidePromise>
      <div className="max-w-md mx-auto py-8">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-3">
            <img src={logoImg} alt="DropPool Logo" className="h-9 w-auto mx-auto object-contain" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {isLogin ? 'Welcome back to DropPool' : 'Join your campus pool'}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">
            {isLogin
              ? 'Sign in with your campus credentials to view and join active pools.'
              : 'Create an account with your official college email domain.'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="bg-[#EEF2FF] p-1 rounded-2xl flex items-center mb-6 border border-[#E0E7FF]">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null) }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isLogin ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null) }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isLogin ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {info && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800">
            <p className="font-semibold">{info}</p>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aanya Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FFF9F5] border border-[#F1E8E2] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Campus Email
              </label>
              <input
                type="email"
                required
                placeholder={isLogin ? 'your.name@iitb.ac.in' : 'student@iitb.ac.in or student@demo.droppool.test'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#FFF9F5] border border-[#F1E8E2] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Supports @iitb.ac.in and @demo.droppool.test
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FFF9F5] border border-[#F1E8E2] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
            </div>

            {!isLogin && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Hostel</label>
                  <input
                    type="text"
                    required
                    value={hostel}
                    onChange={(e) => setHostel(e.target.value)}
                    className="w-full bg-[#FFF9F5] border border-[#F1E8E2] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Block</label>
                  <input
                    type="text"
                    required
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="w-full bg-[#FFF9F5] border border-[#F1E8E2] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Floor</label>
                  <input
                    type="text"
                    required
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full bg-[#FFF9F5] border border-[#F1E8E2] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : isLogin ? 'Sign In to Campus' : 'Create Account'}
            </button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-3 text-center">
              Quick Prototype Personas
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('aanya')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#F1E8E2] hover:bg-[#EEF2FF] hover:border-[#E0E7FF] text-xs font-semibold text-[#0F172A] transition-colors"
              >
                <span>👤 Aanya Rao (IIT Bombay · Hostel 8)</span>
                <span className="text-[#4F46E5]">Select →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('kabir')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#F1E8E2] hover:bg-[#EEF2FF] hover:border-[#E0E7FF] text-xs font-semibold text-[#0F172A] transition-colors"
              >
                <span>👤 Kabir Shah (IIT Bombay · Hostel 8)</span>
                <span className="text-[#4F46E5]">Select →</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('meera')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#F1E8E2] hover:bg-[#EEF2FF] hover:border-[#E0E7FF] text-xs font-semibold text-[#0F172A] transition-colors"
              >
                <span>👤 Meera Iyer (IIT Bombay · Hostel 8)</span>
                <span className="text-[#4F46E5]">Select →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
