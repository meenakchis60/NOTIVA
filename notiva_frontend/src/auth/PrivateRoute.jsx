/**
 * PrivateRoute.jsx
 *
 * Route guard that redirects unauthenticated users to /login.
 * During the initial session-restoration check (loading === true),
 * it renders nothing to avoid a flash of the login page on refresh.
 *
 * Usage:
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 */

import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    // Session is being restored — render nothing to avoid incorrect redirect
    return null
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default PrivateRoute
