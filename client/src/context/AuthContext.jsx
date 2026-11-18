import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Api, getToken, setToken, clearToken, errorMessage } from '../lib/api'

const AuthContext = createContext(null)

export const DEMO_PERSONAS = [
  { key: 'aarav', name: 'Aarav Mehta', hostel: 'Shri Shanta Nikay A', platform: 'Zepto', role: 'Student' },
  { key: 'diya', name: 'Diya Sharma', hostel: 'Shri Shanta Nikay A', platform: 'Zepto', role: 'Student' },
  { key: 'kabir', name: 'Kabir Singh', hostel: 'Shri Shanta Nikay A', platform: 'Zepto', role: 'Student' },
  { key: 'meera', name: 'Meera Iyer', hostel: 'Shri Shanta Nikay A', platform: 'Zepto', role: 'Student' },
  { key: 'rohan', name: 'Rohan Das', hostel: 'Tagore C', platform: 'Instamart', role: 'Free delivery (reject)' },
  { key: 'ishita', name: 'Ishita Nair', hostel: 'Tagore C', platform: 'Instamart', role: 'Free delivery (reject)' },
  { key: 'vihaan', name: 'Vihaan Rao', hostel: 'Shri Shanta Nikay A', platform: 'Blinkit', role: 'Independent' },
  { key: 'sara', name: 'Sara Khan', hostel: 'Shri Shanta Nikay B', platform: 'Blinkit', role: 'Host (awaiting payments)' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [isServerWaking, setIsServerWaking] = useState(false)

  // Fetch meta on mount with cold-start detection (e.g. Render free tier)
  useEffect(() => {
    let resolved = false
    const timer = setTimeout(() => {
      if (!resolved) setIsServerWaking(true)
    }, 3000)

    Api.meta()
      .then((data) => {
        resolved = true
        setIsServerWaking(false)
        setMeta(data)
      })
      .catch(() => {
        resolved = true
        setIsServerWaking(false)
      })

    return () => clearTimeout(timer)
  }, [])

  // Verify current token
  const fetchCurrentUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
      return
    }

    try {
      const data = await Api.me()
      if (data?.user) {
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        clearToken()
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch {
      clearToken()
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()

    const handleLogoutEvent = () => {
      setUser(null)
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
        setUser(res.user)
        setIsAuthenticated(true)
        return { success: true, user: res.user }
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
        setUser(res.user)
        setIsAuthenticated(true)
        return { success: true, user: res.user }
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
    setUser(null)
    setIsAuthenticated(false)
  }

  const updateProfile = async (updates) => {
    try {
      const res = await Api.updateProfile(updates)
      if (res?.user) {
        setUser(res.user)
        return { success: true, user: res.user }
      }
      return { success: false, error: 'Update failed' }
    } catch (err) {
      return { success: false, error: errorMessage(err) }
    }
  }

  // Real login as seeded persona
  const quickLogin = async (key) => {
    setAuthError(null)
    const email = `${key}@demo.droppool.test`
    const password = 'demo-pass-123'
    try {
      const res = await Api.login({ email, password })
      if (res?.token) {
        setToken(res.token)
        setUser(res.user)
        setIsAuthenticated(true)
        return { success: true, user: res.user }
      }
    } catch (err) {
      // If demo accounts not seeded, attempt to seed once and retry
      try {
        await Api.admin.seedDemo()
        const retry = await Api.login({ email, password })
        if (retry?.token) {
          setToken(retry.token)
          setUser(retry.user)
          setIsAuthenticated(true)
          return { success: true, user: retry.user }
        }
      } catch {
        const msg = errorMessage(err)
        setAuthError(`Demo login failed: ${msg}. Make sure demo accounts are seeded.`)
        return { success: false, error: msg }
      }
    }
    return { success: false, error: 'Demo login failed' }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        authError,
        meta,
        isServerWaking,
        login,
        register,
        logout,
        updateProfile,
        quickLogin,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
