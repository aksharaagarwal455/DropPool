import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNav from './MobileNav'

export default function Layout({ children, hidePromise = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F5] text-[#0F172A]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 mb-16 md:mb-6">
        {children}

        {/* The DROPPOOL Promise Banner */}
        {!hidePromise && (
          <div className="mt-12 bg-[#EEF2FF] rounded-2xl md:rounded-3xl p-5 sm:p-6 border border-[#E0E7FF] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-[#4F46E5] text-sm sm:text-base mr-2">
                  The DROPPOOL promise
                </span>
                <span className="text-sm text-[#475569]">
                  We recommend a pool only if every member saves after all fees.
                </span>
              </div>
            </div>

            <Link
              to="/optimizer"
              className="inline-flex items-center text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA] shrink-0 group"
            >
              <span>Explore the math</span>
              <span className="ml-1 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        )}

        {/* Global Footer */}
        <footer className="mt-8 pt-6 pb-2 border-t border-[#F1E8E2] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#64748B]">DROPPOOL</span>
            <span>/</span>
            <span>Interactive concept</span>
          </div>
          <div>
            <span>Demo data only. No live matching, payments or orders.</span>
          </div>
        </footer>
      </main>

      <MobileNav />
    </div>
  )
}
