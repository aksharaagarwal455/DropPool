import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { usePool, POOL_MEMBERS } from '../context/PoolContext'
import avatarAanya from '../assets/avatar_aanya.png'
import avatarKabir from '../assets/avatar_kabir.png'
import avatarMeera from '../assets/avatar_meera.png'

export default function MatchingResultsPage() {
  const { platform, hostel, deliveryWindow } = usePool()

  const aanya = POOL_MEMBERS[0]
  const kabir = POOL_MEMBERS[1]
  const meera = POOL_MEMBERS[2]

  return (
    <Layout>
      {/* Eyebrow & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          02 / Find your people
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
          Illustrative matching · not live AI
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Different carts. Same wavelength.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#64748B]">
          Two compatible students for your 7 pm run. Here's what brings you together.
        </p>
      </div>

      {/* Main Grid: Left (Match Tree) & Right (Small pool, better total card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Tree Container */}
        <div className="lg:col-span-8 bg-[#EEF2FF] rounded-3xl p-6 sm:p-8 border border-[#E0E7FF] relative">
          {/* Top Pill Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#334155] shadow-2xs">
              {platform === 'blinkit' ? 'Blinkit' : platform === 'zepto' ? 'Zepto' : 'Instamart'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#334155] shadow-2xs">
              {hostel.split('·')[0].trim()}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#334155] shadow-2xs">
              {deliveryWindow.replace('Today, ', '')}
            </span>
          </div>

          {/* Interactive Match Visual Diagram */}
          <div className="flex flex-col items-center">
            {/* Seed / You Node Card */}
            <div className="w-full max-w-sm bg-[#13132B] text-white rounded-2xl p-5 shadow-md relative z-10">
              <div className="flex items-center gap-3">
                <img src={avatarAanya} alt="Aanya" className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">Aanya · You</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                      2 items
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">Milk + bread</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/80">
                <span>₹150 alone</span>
                <span className="text-indigo-300 font-medium">Host / Initiator</span>
              </div>
            </div>

            {/* Connecting Lines SVG */}
            <div className="w-full max-w-lg h-14 relative flex items-center justify-center my-[-2px] pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 400 60" fill="none" preserveAspectRatio="none">
                {/* Center stem down from top card */}
                <line x1="200" y1="0" x2="200" y2="20" stroke="#818CF8" strokeWidth="2" strokeDasharray="3 3" />
                {/* Horizontal branch */}
                <path
                  d="M 100 60 C 100 30, 200 30, 200 20 C 200 30, 300 30, 300 60"
                  stroke="#818CF8"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx="200" cy="20" r="3.5" fill="#4F46E5" />
                <circle cx="100" cy="56" r="3.5" fill="#4F46E5" />
                <circle cx="300" cy="56" r="3.5" fill="#4F46E5" />
              </svg>
            </div>

            {/* Branches: Kabir Shah & Meera Iyer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-1 relative z-10">
              {/* Kabir Shah */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <img src={avatarKabir} alt="Kabir Shah" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">Kabir Shah</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{kabir.itemsText}</p>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2FF] text-[#4F46E5]">
                    ✓ Same hostel
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2FF] text-[#4F46E5]">
                    ✓ Same time
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">₹{kabir.soloTotal} alone</span>
                  <span className="font-bold text-[#10B981]">Saves ₹{kabir.savings} in this pool</span>
                </div>
              </div>

              {/* Meera Iyer */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <img src={avatarMeera} alt="Meera Iyer" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">Meera Iyer</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{meera.itemsText}</p>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2FF] text-[#4F46E5]">
                    ✓ Same hostel
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2FF] text-[#4F46E5]">
                    ✓ Same time
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">₹{meera.soloTotal} alone</span>
                  <span className="font-bold text-[#10B981]">Saves ₹{meera.savings} in this pool</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dark Navy Summary Card */}
        <div className="lg:col-span-4">
          <div className="bg-[#13132B] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90 mb-4">
              EVERYONE SAVES
            </span>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              A small pool. <br />
              A better total.
            </h2>
            <p className="text-xs text-white/70 mt-1">
              3 people · 6 items · 1 delivery
            </p>

            <div className="my-6 border-t border-white/10" />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-white/80">
                <span>Separate carts</span>
                <span className="font-bold text-white text-base">₹390</span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <span>One shared pool</span>
                <span className="font-bold text-white text-base">₹330</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-3xl font-extrabold text-[#10B981] tracking-tight">
                ₹60 saved together
              </p>
              <p className="text-xs text-white/60 mt-1">
                Shared delivery fee: ₹30 split among 3 students
              </p>
            </div>

            <div className="mt-8">
              <Link
                to="/optimizer"
                className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow text-center"
              >
                <span>See member-wise savings</span>
                <span className="ml-2 font-bold">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Not a random match (3 feature cards) */}
      <div className="mt-12">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Not a random match.</h2>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">Every connection has a reason.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-6 border border-[#F1E8E2] shadow-xs">
            <span className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-bold text-xs flex items-center justify-center mb-4">
              01
            </span>
            <h3 className="text-base font-bold text-[#0F172A] mb-2">Same platform</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              All three carts are on Blinkit. No cross-platform price assumptions.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-6 border border-[#F1E8E2] shadow-xs">
            <span className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-bold text-xs flex items-center justify-center mb-4">
              02
            </span>
            <h3 className="text-base font-bold text-[#0F172A] mb-2">A real pickup fit</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Everyone is in Hostel 8, with the same 30-minute delivery window.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-6 border border-[#F1E8E2] shadow-xs">
            <span className="w-8 h-8 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-bold text-xs flex items-center justify-center mb-4">
              03
            </span>
            <h3 className="text-base font-bold text-[#0F172A] mb-2">Compatible basket</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Six complementary items fit one cart. Shared fees drop from ₹90 to ₹30.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
