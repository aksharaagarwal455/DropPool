import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { usePool } from '../context/PoolContext'
import avatarAanya from '../assets/avatar_aanya.png'
import avatarKabir from '../assets/avatar_kabir.png'
import avatarMeera from '../assets/avatar_meera.png'

export default function PoolDetailsPage() {
  const { poolStatusStep, setPoolStatusStep } = usePool()
  const navigate = useNavigate()

  const poolItems = [
    { name: 'Amul toned milk', detail: '500 ml · Qty 1', member: 'Aanya', price: 60 },
    { name: 'Whole wheat bread', detail: '400 g · Qty 1', member: 'Aanya', price: 60 },
    { name: 'Quaker oats', detail: '200 g · Qty 1', member: 'Kabir', price: 70 },
    { name: 'Bananas', detail: '3 pcs · Qty 1', member: 'Kabir', price: 30 },
    { name: 'Instant noodles', detail: 'Pack of 2 · Qty 1', member: 'Meera', price: 50 },
    { name: 'Marie biscuits', detail: '150 g · Qty 1', member: 'Meera', price: 30 },
  ]

  const contributors = [
    { name: 'Aanya', role: 'You · Host', avatar: avatarAanya, share: 130 },
    { name: 'Kabir', role: 'Member', avatar: avatarKabir, share: 110 },
    { name: 'Meera', role: 'Member', avatar: avatarMeera, share: 90 },
  ]

  const steps = [
    { num: 1, title: 'Matched', subtitle: '3 compatible members' },
    { num: 2, title: 'Reviewing costs', subtitle: 'You are here' },
    { num: 3, title: 'Ready to order', subtitle: 'Host places order externally' },
    { num: 4, title: 'Collected', subtitle: 'Meet at the common room' },
  ]

  return (
    <Layout>
      {/* Eyebrow & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4F46E5]">
          04 / Your shared pool
        </p>
        <span className="inline-flex self-start sm:self-auto items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
          Demo pool · no order placed
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
          The 7 pm essentials run
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#64748B]">
          Pool DP–108 · Blinkit · Hostel 8 · Today, 7:00–7:30 pm
        </p>
      </div>

      {/* Stepper Progress Bar Card */}
      <div className="bg-[#EEF2FF] rounded-3xl p-6 sm:p-7 border border-[#E0E7FF] mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((st) => {
            const isCompleted = poolStatusStep > st.num
            const isCurrent = poolStatusStep === st.num

            return (
              <div
                key={st.num}
                onClick={() => setPoolStatusStep(st.num)}
                className="cursor-pointer group flex items-start gap-3"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-[#4F46E5] text-white'
                      : isCurrent
                      ? 'bg-[#4F46E5] text-white ring-4 ring-[#4F46E5]/20'
                      : 'bg-white text-gray-400 border border-gray-200'
                  }`}
                >
                  {isCompleted ? '✓' : `0${st.num}`}
                </div>
                <div>
                  <p
                    className={`text-xs sm:text-sm font-bold transition-colors ${
                      isCurrent || isCompleted ? 'text-[#0F172A]' : 'text-[#64748B]'
                    }`}
                  >
                    {st.title}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{st.subtitle}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress track */}
        <div className="mt-5 w-full bg-white/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#4F46E5] h-full rounded-full transition-all duration-300"
            style={{ width: `${(poolStatusStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Left (Items + Total) & Right (Contributors + Host Card + CTAs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (One cart. Everyone's essentials.) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            <h2 className="text-xl font-bold text-[#0F172A]">One cart. Everyone's essentials.</h2>
            <p className="text-xs text-[#64748B] mt-1 mb-6">6 items · quantities are illustrative</p>

            {/* Item Rows */}
            <div className="divide-y divide-gray-100">
              {poolItems.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{item.name}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{item.detail}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5]">
                      {item.member}
                    </span>
                    <span className="text-sm font-bold text-[#0F172A] w-12 text-right">
                      ₹{item.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Total Card */}
          <div className="bg-[#EEF2FF] rounded-3xl p-6 border border-[#E0E7FF] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#64748B]">Items ₹300 + shared fees ₹30</p>
              <p className="text-base font-bold text-[#0F172A] mt-0.5">Total demo cost</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-[#0F172A]">₹330</span>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8]">
            This concept does not place orders or collect payments. A host would order on the selected platform.
          </p>
        </div>

        {/* Right Column (Who contributes what + Your host + CTAs) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Who contributes what */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F1E8E2] shadow-xs">
            <h2 className="text-xl font-bold text-[#0F172A]">Who contributes what</h2>
            <p className="text-xs text-[#64748B] mt-1 mb-6">Estimated shares · payment not tracked</p>

            <div className="space-y-4">
              {contributors.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-100" />
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{c.name}</p>
                      <p className="text-xs text-[#64748B]">{c.role}</p>
                    </div>
                  </div>
                  <span className="text-base font-extrabold text-[#0F172A]">₹{c.share}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dark Navy Host Card */}
          <div className="bg-[#13132B] text-white rounded-3xl p-6 sm:p-7 shadow-sm">
            <h3 className="text-base font-bold text-white">Your host: Aanya</h3>
            <p className="text-xs text-white/80 mt-1">
              Hostel 8 common room · 7:00 pm
            </p>
            <p className="text-xs text-white/60 mt-3 pt-3 border-t border-white/10 leading-relaxed">
              Coordinate pickup before placing any order.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/optimizer')}
              className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-all hover:shadow"
            >
              Review cost breakdown
            </button>

            <Link
              to="/history"
              className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-[#0F172A] text-sm font-semibold border border-gray-200 transition-colors shadow-2xs"
            >
              <span>Explore completed examples</span>
              <span className="ml-1.5">→</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
