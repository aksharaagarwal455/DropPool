import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function OrderHistoryPage() {
  const pastPools = [
    {
      title: 'Late-night study stash',
      date: '14 Nov 2026 · Hostel 8',
      platform: 'Blinkit',
      share: 130,
      saved: 20,
      state: 'Completed demo',
    },
    {
      title: 'Breakfast before the 8 am',
      date: '11 Nov 2026 · Hostel 8',
      platform: 'Zepto',
      share: 156,
      saved: 24,
      state: 'Completed demo',
    },
    {
      title: 'The laundry-day restock',
      date: '08 Nov 2026 · Hostel 8',
      platform: 'Instamart',
      share: 94,
      saved: 16,
      state: 'Completed demo',
    },
  ]

  return (
    <Layout>
      {/* Eyebrow & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          Your campus cart archive
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
          Example history · no actual transactions
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          Small pools. Savings that add up.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#64748B]">
          A sample of what smarter campus shopping could look like.
        </p>
      </div>

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#13132B] text-white rounded-3xl p-6 sm:p-7 shadow-xs">
          <p className="text-xs font-semibold text-white/70">Total demo savings</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#10B981] mt-2">₹120</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F1E8E2] shadow-xs">
          <p className="text-xs font-semibold text-[#64748B]">Example pools</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-2">06</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F1E8E2] shadow-xs">
          <p className="text-xs font-semibold text-[#64748B]">Delivery fees shared</p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-2">18</p>
        </div>
      </div>

      {/* Recent Examples Table Card */}
      <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0F172A]">Recent examples</h2>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5]">
            Last 30 days
          </span>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 font-semibold">Pool / Date</th>
                <th className="pb-3 font-semibold">Platform</th>
                <th className="pb-3 font-semibold">Your share</th>
                <th className="pb-3 font-semibold">Saved</th>
                <th className="pb-3 font-semibold text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pastPools.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4">
                    <p className="font-bold text-[#0F172A]">{row.title}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{row.date}</p>
                  </td>
                  <td className="py-4 font-medium text-[#475569]">{row.platform}</td>
                  <td className="py-4 font-extrabold text-[#0F172A]">₹{row.share}</td>
                  <td className="py-4 font-extrabold text-[#10B981]">₹{row.saved}</td>
                  <td className="py-4 text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5]">
                      {row.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-[#94A3B8]">
          Showing 3 of 6 examples · earlier examples saved another ₹60
        </div>
      </div>

      {/* Your next cart could cost less Banner */}
      <div className="mt-8 bg-[#EEF2FF] rounded-3xl p-6 sm:p-8 border border-[#E0E7FF] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#0F172A]">Your next cart could cost less.</h3>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Start an intent. Compare the math. Pool only if everyone saves.
          </p>
        </div>

        <Link
          to="/intent"
          className="inline-flex items-center px-6 py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow shrink-0"
        >
          <span className="mr-1.5 text-base">+</span>
          Create Shopping Intent
        </Link>
      </div>
    </Layout>
  )
}
