import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { usePool } from '../context/PoolContext'
import heroDiagram from '../assets/hero_diagram.png'
import avatarAanya from '../assets/avatar_aanya.png'
import avatarKabir from '../assets/avatar_kabir.png'
import avatarMeera from '../assets/avatar_meera.png'

export default function DashboardPage() {
  const { user } = useAuth()
  const { isBackendConnected } = usePool()

  return (
    <Layout>
      {/* Eyebrow */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          A little coordination. A better cart.
        </p>
      </div>

      {/* Hero Banner */}
      <div className="bg-[#EEF2FF] rounded-3xl p-6 sm:p-10 border border-[#E0E7FF] relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 z-10">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-white text-[#4F46E5] shadow-xs mb-4">
              Made for your hostel, not the whole internet.
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
              Your campus. <br />
              One smarter way to shop.
            </h1>

            <p className="mt-3 text-base sm:text-lg font-medium text-[#334155]">
              Many carts. One smarter pool.
            </p>
            <p className="mt-1 text-sm text-[#64748B]">
              Pool only when every member pays less. No exceptions.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                to="/intent"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
              >
                <span className="mr-2 text-lg leading-none">+</span>
                Create Shopping Intent
              </Link>

              <Link
                to="/optimizer"
                className="inline-flex items-center text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors py-2"
              >
                <span>See how savings work</span>
                <span className="ml-1 text-base">↗</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm bg-white/70 backdrop-blur-xs rounded-2xl p-4 border border-white/80 shadow-xs">
              <img
                src={heroDiagram}
                alt="3 individual carts converging into 1 shared pool"
                className="w-full h-auto object-contain"
              />
              <div className="flex justify-between items-center text-[11px] font-medium text-[#64748B] mt-2 px-1">
                <span>3 individual carts</span>
                <span className="font-semibold text-[#4F46E5]">1 shared pool</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border border-[#F1E8E2] shadow-xs">
          <p className="text-xs font-semibold text-[#64748B]">Your demo savings</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#10B981]">₹120</span>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Across 6 example pools</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border border-[#F1E8E2] shadow-xs">
          <p className="text-xs font-semibold text-[#64748B]">Active pool</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">01</span>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Ready for your review</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border border-[#F1E8E2] shadow-xs">
          <p className="text-xs font-semibold text-[#64748B]">Compatible students</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">02</span>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Same hostel. Same window.</p>
        </div>
      </div>

      {/* Main Grid: Active Pools & Campus Corner Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Left Column: Your active pools */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Your active pools</h2>
                <p className="text-xs sm:text-sm text-[#64748B]">Small groups. Shared delivery. Everyone saves.</p>
              </div>
              <Link to="/pools" className="text-xs sm:text-sm font-semibold text-[#4F46E5] hover:underline flex items-center gap-1">
                View all <span>→</span>
              </Link>
            </div>

            {/* Pool Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F1E8E2] shadow-xs hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-[#334155]">
                    Blinkit
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    Ready to review
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                    The 7 pm essentials run
                  </h3>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                    Hostel 8 · Today, 7:00–7:30 pm · 6 items
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                      <img src={avatarAanya} alt="Aanya" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" />
                      <img src={avatarKabir} alt="Kabir" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" />
                      <img src={avatarMeera} alt="Meera" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" />
                    </div>
                    <span className="text-xs font-medium text-[#475569]">
                      You, Kabir + Meera
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
                  <div className="sm:text-right">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#10B981]">₹60</span>
                    <p className="text-[11px] text-[#64748B]">total demo savings</p>
                  </div>
                  <Link
                    to="/pools"
                    className="mt-3 inline-flex items-center px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-colors shadow-xs"
                  >
                    Review savings <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: In your corner of campus */}
        <div className="lg:col-span-4">
          <div className="bg-[#13132B] text-white rounded-3xl p-6 sm:p-7 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">In your corner of campus</h3>
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/80 mt-2 mb-4">
                Demo activity
              </span>

              <div className="space-y-4">
                {/* Activity 1 */}
                <div className="flex items-start gap-3">
                  <img src={avatarKabir} alt="Kabir" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">Kabir joined your pool</p>
                    <p className="text-[11px] text-white/60">6 min ago · Hostel 8</p>
                  </div>
                </div>

                {/* Activity 2 */}
                <div className="flex items-start gap-3">
                  <img src={avatarAanya} alt="Aanya" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">A better match found</p>
                    <p className="text-[11px] text-white/60">12 min ago · Saves everyone ₹20</p>
                  </div>
                </div>

                {/* Activity 3 */}
                <div className="flex items-start gap-3">
                  <img src={avatarMeera} alt="Meera" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-white">Your intent is ready</p>
                    <p className="text-[11px] text-white/60">18 min ago · 3 matching products</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
              <span>{isBackendConnected ? 'Backend API connected' : 'Interactive Demo Mode'}</span>
              <Link to="/matches" className="text-indigo-300 hover:text-white font-medium">See matches →</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
