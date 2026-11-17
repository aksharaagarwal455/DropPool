import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#84CC16] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#0F3D1E]">Connecting to DropPool…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children ? children : <Outlet />
}
