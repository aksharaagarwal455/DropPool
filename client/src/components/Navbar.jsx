import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoImg from '../assets/logo.png'

export default function Navbar() {
  const { user, isAuthenticated, logout, switchDemoUser } = useAuth()
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
    <header className="sticky top-0 z-40 w-full bg-[#FFF9F5]/90 backdrop-blur-md border-b border-[#F1E8E2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Left: Logo & Campus Pill */}
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="flex items-center group">
              <img src={logoImg} alt="DropPool Logo" className="h-7 w-auto object-contain" />
            </Link>

            <div className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
              <span>IIT Bombay</span>
              <span className="mx-1.5 opacity-40">/</span>
              <span className="text-[#6366F1]">Campus demo</span>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-8 h-full">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `inline-flex items-center h-full px-2 lg:px-3 text-sm transition-colors relative font-medium ${
                    isActive
                      ? 'text-[#0F172A] font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4F46E5] rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: User Menu Dropdown */}
          <div className="flex items-center gap-3" ref={menuRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-black/5 transition-colors focus:outline-none"
              aria-label="User menu"
            >
              <div className="relative">
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                {isAuthenticated && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 ring-2 ring-white rounded-full" />
                )}
              </div>
              <svg
                className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-4 top-16 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <img src={user.profileImage} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{user.name}</p>
                      <p className="text-xs text-[#64748B] truncate">{user.email || user.hostel}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#64748B] bg-[#FFF9F5] px-2.5 py-1.5 rounded-lg border border-[#F1E8E2]">
                    <span>Hostel: <strong className="text-[#0F172A]">{user.hostel || 'Hostel 8'}</strong></span>
                    <span className="text-[#10B981] font-semibold">₹{user.stats?.totalSavings || 120} saved</span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-[#334155] hover:bg-[#EEF2FF] hover:text-[#4F46E5] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile & Settings
                  </Link>

                  <Link
                    to="/optimizer"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-[#334155] hover:bg-[#EEF2FF] hover:text-[#4F46E5] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2.5 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Cost Optimizer Math
                  </Link>
                </div>

                {/* Demo Accounts Switcher */}
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">Switch Persona</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => { switchDemoUser('aanya'); setDropdownOpen(false) }}
                      className={`px-2 py-1 text-xs rounded-md font-medium text-center transition-colors ${
                        user.name?.includes('Aanya') ? 'bg-[#4F46E5] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Aanya
                    </button>
                    <button
                      onClick={() => { switchDemoUser('kabir'); setDropdownOpen(false) }}
                      className={`px-2 py-1 text-xs rounded-md font-medium text-center transition-colors ${
                        user.name?.includes('Kabir') ? 'bg-[#4F46E5] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Kabir
                    </button>
                    <button
                      onClick={() => { switchDemoUser('meera'); setDropdownOpen(false) }}
                      className={`px-2 py-1 text-xs rounded-md font-medium text-center transition-colors ${
                        user.name?.includes('Meera') ? 'bg-[#4F46E5] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Meera
                    </button>
                  </div>
                </div>

                <div className="py-1 border-t border-gray-100">
                  {isAuthenticated ? (
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); navigate('/') }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-[#4F46E5] font-medium hover:bg-[#EEF2FF]"
                    >
                      <svg className="w-4 h-4 mr-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In / Register
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
