import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PoolProvider } from './context/PoolContext'
import ProtectedRoute from './components/ProtectedRoute'

import DashboardPage from './pages/DashboardPage'
import CreateIntentPage from './pages/CreateIntentPage'
import MatchingResultsPage from './pages/MatchingResultsPage'
import CostOptimizerPage from './pages/CostOptimizerPage'
import PoolDetailsPage from './pages/PoolDetailsPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import ProfilePage from './pages/ProfilePage'
import AuthPage from './pages/AuthPage'

export default function App() {
  return (
    <AuthProvider>
      <PoolProvider>
        <BrowserRouter>
          <Routes>
            {/* Public authentication routes */}
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/register" element={<AuthPage initialMode="register" />} />

            {/* Authenticated campus routes protected behind ProtectedRoute */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/intent" element={<CreateIntentPage />} />
              <Route path="/matches" element={<MatchingResultsPage />} />
              <Route path="/optimizer" element={<CostOptimizerPage />} />
              <Route path="/pools" element={<PoolDetailsPage />} />
              <Route path="/pools/:id" element={<PoolDetailsPage />} />
              <Route path="/history" element={<OrderHistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Fallback to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PoolProvider>
    </AuthProvider>
  )
}
