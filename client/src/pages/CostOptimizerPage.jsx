import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { usePool } from '../context/PoolContext'
import avatarAanya from '../assets/avatar_aanya.png'
import avatarKabir from '../assets/avatar_kabir.png'
import avatarMeera from '../assets/avatar_meera.png'

export default function CostOptimizerPage() {
  const {
    allocationRule,
    setAllocationRule,
    activeScenario,
    setActiveScenario,
    getOptimizerData,
  } = usePool()

  const navigate = useNavigate()
  const data = getOptimizerData()

  return (
    <Layout>
      {/* Eyebrow & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          03 / Check the math
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
          Demo estimate · not a platform quote
        </span>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            If one person loses, it's not a pool.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#64748B]">
            Same six items. Same delivery window. Every fee included in this illustrative comparison.
          </p>
        </div>

        {/* Interactive Rule & Scenario Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 text-xs shadow-2xs">
            <button
              onClick={() => setActiveScenario('recommended')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeScenario === 'recommended'
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Recommended (₹60 saved)
            </button>
            <button
              onClick={() => setActiveScenario('rejected')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeScenario === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Negative Case (Rejected)
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Comparison cards + Everyone saves check + Negative Banner) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Comparison Card: 390 -> 330 */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0F172A]">The 7 pm essentials run</h2>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5]">
                3 members
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Individual Carts */}
              <div className="sm:col-span-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Individual Carts
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
                  ₹{data.soloGrandTotal}
                </p>
                <p className="text-xs text-[#64748B] mt-1">Items ₹300 + fees ₹90</p>
              </div>

              {/* Arrow */}
              <div className="sm:col-span-2 flex justify-center text-[#4F46E5] text-2xl font-bold">
                →
              </div>

              {/* One Shared Pool */}
              <div className="sm:col-span-5 bg-[#EEF2FF] rounded-2xl p-4 sm:p-5 border border-[#E0E7FF]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5]">
                  One Shared Pool
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
                  ₹{data.pooledGrandTotal ?? '—'}
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  {data.pooledGrandTotal ? 'Items ₹300 + fees ₹30' : 'Incomplete fee data'}
                </p>
              </div>
            </div>
          </div>

          {/* The everyone-saves check table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F172A]">The everyone-saves check</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Split:</span>
                <button
                  onClick={() => setAllocationRule('proportional')}
                  className={`px-2 py-0.5 rounded font-medium ${allocationRule === 'proportional' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-gray-500'}`}
                >
                  Proportional
                </button>
                <span>|</span>
                <button
                  onClick={() => setAllocationRule('equal')}
                  className={`px-2 py-0.5 rounded font-medium ${allocationRule === 'equal' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-gray-500'}`}
                >
                  Equal
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-gray-100 pb-3 mb-2">
              <span className="col-span-5">Member</span>
              <span className="col-span-2 text-center">Alone</span>
              <span className="col-span-2 text-center">Pooled</span>
              <span className="col-span-3 text-right">Savings</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-100">
              {data.members.map((member) => (
                <div key={member.id} className="py-3.5 grid grid-cols-12 items-center text-sm">
                  {/* Member Name with Avatar */}
                  <div className="col-span-5 flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-100"
                    />
                    <span className="font-semibold text-[#0F172A]">{member.label}</span>
                  </div>

                  {/* Alone Total */}
                  <div className="col-span-2 text-center text-[#64748B]">
                    ₹{member.soloTotal}
                  </div>

                  {/* Pooled Total */}
                  <div className="col-span-2 text-center font-bold text-[#0F172A]">
                    ₹{member.pooledShare}
                  </div>

                  {/* Savings / Loss */}
                  <div className="col-span-3 text-right font-bold">
                    {member.savings > 0 ? (
                      <span className="text-[#10B981] inline-flex items-center gap-1">
                        <span>✓</span>
                        <span>₹{member.savings}</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 inline-flex items-center gap-1">
                        <span>✕</span>
                        <span>-₹{Math.abs(member.savings)}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Product Rule Showcase: Rejected Alternative Banner */}
          <div className="bg-[#FFF1F2] rounded-3xl p-6 sm:p-7 border border-[#FECDD3]">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 mb-3">
              Not Recommended
            </span>

            <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Lower total ≠ a better deal for everyone
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] mt-1">
              Alternative: ₹360 total. Aanya ₹132 · Kabir ₹116 · Meera ₹112.
            </p>
            <p className="text-xs sm:text-sm font-semibold text-rose-700 mt-2">
              Meera pays ₹2 more than ₹110 alone. This pool is rejected.
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-3 border-t border-rose-200/60 pt-2">
              Strict rule: each pooled total must be lower than that member's individual total.
            </p>
          </div>
        </div>

        {/* Right Column (Dark summary + Where does the ₹60 come from + Action Buttons) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Dark Navy Highlight Card */}
          <div className="bg-[#13132B] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 mb-4">
              <span>✓</span> ALL 3 MEMBERS SAVE
            </span>

            <p className="text-4xl sm:text-5xl font-extrabold text-[#10B981] tracking-tight">
              ₹60
            </p>
            <p className="text-sm font-medium text-white/90 mt-2">
              Total demo savings · 15.4% less
            </p>
            <p className="text-xs text-white/60 mt-1">
              ₹20 less for each person. No one subsidizes anyone.
            </p>
          </div>

          {/* Light Lavender Card: Where does the ₹60 come from? */}
          <div className="bg-[#EEF2FF] rounded-3xl p-6 sm:p-8 border border-[#E0E7FF]">
            <h3 className="text-base font-bold text-[#0F172A] mb-4">
              Where does the ₹60 come from?
            </h3>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-[#475569]">
                <span>Items · unchanged</span>
                <span className="font-semibold text-[#0F172A]">₹300 → ₹300</span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span>Delivery + handling</span>
                <span className="font-semibold text-[#0F172A]">₹90 → ₹30</span>
              </div>
              <div className="flex items-center justify-between text-[#475569]">
                <span>Shared fees per member</span>
                <span className="font-semibold text-[#4F46E5]">₹10 each</span>
              </div>
            </div>

            <p className="mt-5 pt-3 border-t border-[#E0E7FF] text-[11px] text-[#64748B] leading-relaxed">
              Assumes ₹30 fees per separate order and ₹30 for one shared order. No coupons assumed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/pools')}
              className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow"
            >
              <span>Continue with this demo pool</span>
              <span className="ml-2 font-bold text-base">→</span>
            </button>

            <Link
              to="/matches"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-[#0F172A] text-sm font-semibold border border-gray-200 transition-colors shadow-2xs"
            >
              Back to matches
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
