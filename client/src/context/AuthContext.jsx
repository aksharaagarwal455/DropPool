import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Api, getToken, setToken, clearToken, errorMessage } from '../lib/api'
import avatarAanya from '../assets/avatar_aanya.png'
import avatarKabir from '../assets/avatar_kabir.png'
import avatarMeera from '../assets/avatar_meera.png'

const AuthContext = createContext(null)

export const DEMO_USERS = {
  aanya: {
    id: 'demo_aanya',
    name: 'Aanya Rao',
    email: 'aanya@iitb.ac.in',
    hostel: 'Hostel 8',
    block: 'A',
    floor: '3',
    room: '312',
    campus: 'IIT Bombay',
    profileImage: avatarAanya,
    role: 'student',
    emailVerified: true,
    isDemo: true,
    stats: {
      totalSavings: 120,
      runsJoined: 6,
      deliveryMilesAvoided: 18,
    },
    preferences: {
      defaultPlatform: 'blinkit',
      deliveryWindow: 'Evenings · 7:00–7:30 pm',
      pickupLocation: 'Hostel 8 common room',
    },
  },
  kabir: {
    id: 'demo_kabir',
    name: 'Kabir Shah',
    email: 'kabir@iitb.ac.in',
    hostel: 'Hostel 8',
    block: 'B',
    floor: '2',
    campus: 'IIT Bombay',
    profileImage: avatarKabir,
    role: 'student',
    isDemo: true,
  },
  meera: {
    id: 'demo_meera',
    name: 'Meera Iyer',
    email: 'meera@iitb.ac.in',
    hostel: 'Hostel 8',
    block: 'A',
    floor: '2',
    campus: 'IIT Bombay',
    profileImage: avatarMeera,
    role: 'student',
    isDemo: true,
  },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO_USERS.aanya)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const fetchCurrentUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(DEMO_USERS.aanya)
      setIsAuthenticated(false)
      setLoading(false)
      return
    }

    try {
      const data = await Api.me()
      if (data?.user) {
        setUser({
          ...data.user,
          profileImage: data.user.profileImage || avatarAanya,
          campus: 'IIT Bombay',
          stats: {
            totalSavings: 120,
            runsJoined: 6,
            deliveryMilesAvoided: 18,
          },
          preferences: {
            defaultPlatform: 'blinkit',
            deliveryWindow: 'Evenings · 7:00–7:30 pm',
            pickupLocation: `${data.user.hostel || 'Hostel 8'} common room`,
          },
        })
        setIsAuthenticated(true)
      }
    } catch {
      // Backend unavailable or token expired; fallback cleanly to demo profile
      setUser(DEMO_USERS.aanya)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()

    const handleLogoutEvent = () => {
      setUser(DEMO_USERS.aanya)
      setIsAuthenticated(false)
    }

    window.addEventListener('droppool:logout', handleLogoutEvent)
    return () => window.removeEventListener('droppool:logout', handleLogoutEvent)
  }, [fetchCurrentUser])

  const login = async (email, password) => {
    setAuthError(null)
    try {
      const res = await Api.login({ email, password })
      if (res?.token) {
        setToken(res.token)
        setUser({
          ...res.user,
          profileImage: res.user.profileImage || avatarAanya,
          campus: 'IIT Bombay',
          stats: { totalSavings: 120, runsJoined: 6, deliveryMilesAvoided: 18 },
          preferences: {
            defaultPlatform: 'blinkit',
            deliveryWindow: 'Evenings · 7:00–7:30 pm',
            pickupLocation: `${res.user.hostel || 'Hostel 8'} common room`,
          },
        })
        setIsAuthenticated(true)
        return { success: true }
      }
      return { success: false, error: 'Login failed' }
    } catch (err) {
      const msg = errorMessage(err)
      setAuthError(msg)
      return { success: false, error: msg }
    }
  }

  const register = async (formData) => {
    setAuthError(null)
    try {
      const res = await Api.register(formData)
      if (res?.token) {
        setToken(res.token)
        setUser({
          ...res.user,
          profileImage: res.user.profileImage || avatarAanya,
          campus: 'IIT Bombay',
          stats: { totalSavings: 0, runsJoined: 0, deliveryMilesAvoided: 0 },
          preferences: {
            defaultPlatform: 'blinkit',
            deliveryWindow: 'Evenings · 7:00–7:30 pm',
            pickupLocation: `${res.user.hostel} common room`,
          },
        })
        setIsAuthenticated(true)
        return { success: true }
      }
      return { success: false, error: 'Registration failed' }
    } catch (err) {
      const msg = errorMessage(err)
      setAuthError(msg)
      return { success: false, error: msg }
    }
  }

  const logout = () => {
    clearToken()
    setUser(DEMO_USERS.aanya)
    setIsAuthenticated(false)
  }

  const updateProfile = async (updates) => {
    if (isAuthenticated) {
      try {
        const res = await Api.updateProfile(updates)
        if (res?.user) {
          setUser((prev) => ({ ...prev, ...res.user }))
          return { success: true }
        }
      } catch (err) {
        return { success: false, error: errorMessage(err) }
      }
    }
    // Update local profile state in demo mode
    setUser((prev) => ({ ...prev, ...updates }))
    return { success: true }
  }

  const switchDemoUser = (userKey) => {
    if (DEMO_USERS[userKey]) {
      clearToken()
      setUser(DEMO_USERS[userKey])
      setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        authError,
        login,
        register,
        logout,
        updateProfile,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
