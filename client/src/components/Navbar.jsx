import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BrandLogo from './BrandLogo'
import avatarAanya from '../assets/avatar_aanya.png'

export default function Navbar({ meta }) {
  const { user, isAuthenticated, logout, quickLogin } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems = [
    { name: 'Overview', path: '/' },
    { name: 'My intent', path: '/intent' },
    { name: 'Matches', path: '/matches' },
    { name: 'My pools', path: '/pools' },
    { name: 'History', path: '/history' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F8FAF6]/90 backdrop-blur-md border-b border-[#E2EBDD]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Left: Brand Logo & Campus Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="flex items-center group">
              <BrandLogo />
            </Link>

            <div className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
              <span>Banasthali Vidyapeeth</span>
              <span className="mx-1.5 opacity-40">/</span>
              <span className="text-[#65A30D]">Campus demo</span>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-8 h-full">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `inline-flex items-center h-full px-2 lg:px-3 text-sm transition-colors relative font-medium ${
                    isActive
                      ? 'text-[#0F3D1E] font-bold'
                      : 'text-[#475569] hover:text-[#0F3D1E]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#84CC16] rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: User Avatar & Session Controls */}
          <div className="flex items-center gap-3" ref={menuRef}>
            {isAuthenticated ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-black/5 transition-colors focus:outline-none"
                aria-label="User menu"
              >
                <div className="relative">
                  <img
                    src={user?.profileImage || avatarAanya}
                    alt={user?.name || 'User'}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-[#84CC16] shadow-xs"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#84CC16] ring-2 ring-white rounded-full" />
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-[#475569] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-[#0F3D1E] text-white hover:bg-[#165a2d] transition-colors"
              >
                Sign In
              </Link>
            )}

            {dropdownOpen && isAuthenticated && (
              <div className="absolute right-4 top-16 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-3 border-b border-gray-100 bg-[#F0FDF4]/50">
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.profileImage || avatarAanya}
                      alt={user?.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200"
                    />
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-[#0F3D1E] truncate">{user?.name}</p>
                      <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#475569] bg-white px-2.5 py-1.5 rounded-lg border border-[#BBF7D0]">
                    <span>Hostel: <strong className="text-[#0F3D1E]">{user?.hostel || 'Hostel'}</strong></span>
                    <span className="font-semibold text-[#15803D]">Block {user?.block || 'A'} · F{user?.floor || '1'}</span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-xs font-medium text-[#0F3D1E] hover:bg-[#F0FDF4] hover:text-[#166534] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-[#65A30D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile & UPI Details
                  </Link>

                  <Link
                    to="/optimizer"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-xs font-medium text-[#0F3D1E] hover:bg-[#F0FDF4] hover:text-[#166534] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-[#65A30D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Cost Decision Engine
                  </Link>
                </div>

                {meta?.demoMode && (
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-[#F8FAF6]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#65A30D] mb-1.5">
                      Switch Demo Account
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { quickLogin('aarav'); setDropdownOpen(false) }}
                        className="px-2 py-1 text-[11px] rounded bg-white hover:bg-[#F0FDF4] border border-gray-200 text-left font-medium text-[#0F3D1E]"
                      >
                        Aarav (Zepto)
                      </button>
                      <button
                        onClick={() => { quickLogin('rohan'); setDropdownOpen(false) }}
                        className="px-2 py-1 text-[11px] rounded bg-white hover:bg-[#F0FDF4] border border-gray-200 text-left font-medium text-[#0F3D1E]"
                      >
                        Rohan (Instamart)
                      </button>
                      <button
                        onClick={() => { quickLogin('kabir'); setDropdownOpen(false) }}
                        className="px-2 py-1 text-[11px] rounded bg-white hover:bg-[#F0FDF4] border border-gray-200 text-left font-medium text-[#0F3D1E]"
                      >
                        Kabir (Zepto)
                      </button>
                      <button
                        onClick={() => { quickLogin('sara'); setDropdownOpen(false) }}
                        className="px-2 py-1 text-[11px] rounded bg-white hover:bg-[#F0FDF4] border border-gray-200 text-left font-medium text-[#0F3D1E]"
                      >
                        Sara (Host)
                      </button>
                    </div>
                  </div>
                )}

                <div className="py-1 border-t border-gray-100">
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); navigate('/login') }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
