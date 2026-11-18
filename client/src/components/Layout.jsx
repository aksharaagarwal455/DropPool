import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNav from './MobileNav'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children, hidePromise = false, meta = null }) {
  const { isServerWaking } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF6] text-[#0F3D1E]">
      {isServerWaking && (
        <div className="bg-[#0F3D1E] text-[#ECFCCB] px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-[#84CC16]/40 animate-pulse">
          <span>⏳</span>
          <span>
            Connecting to DropPool backend on Render… First request wakes the free-tier service (takes ~20-30s).
          </span>
        </div>
      )}
      <Navbar meta={meta} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 mb-16 md:mb-6">
        {children}

        {/* The DROPPOOL Promise Banner */}
        {!hidePromise && (
          <div className="mt-12 bg-[#F0FDF4] rounded-2xl md:rounded-3xl p-5 sm:p-6 border border-[#BBF7D0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#84CC16]/20 text-[#15803D] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-[#15803D] text-sm sm:text-base mr-2">
                  The DROPPOOL promise
                </span>
                <span className="text-sm text-[#334155]">
                  We recommend a pool only if every member saves after all fees.
                </span>
              </div>
            </div>

            <Link
              to="/optimizer"
              className="inline-flex items-center text-sm font-bold text-[#15803D] hover:text-[#166534] shrink-0 group"
            >
              <span>Explore the math</span>
              <span className="ml-1 group-hover:translate-x-0.5 transition-transform font-bold">→</span>
            </Link>
          </div>
        )}

        {/* Global Footer */}
        <footer className="mt-8 pt-6 pb-2 border-t border-[#E2EBDD] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F3D1E]">DropPool</span>
            <span>·</span>
            <span>Banasthali Vidyapeeth demand intelligence</span>
          </div>
          <div>
            <span>Illustrative fees, not verified current platform pricing.</span>
          </div>
        </footer>
      </main>

      <MobileNav />
    </div>
  )
}
