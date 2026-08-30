/**
 * useAuth.js
 *
 * Convenience hook for consuming AuthContext.
 * Throws an error if used outside of AuthProvider to catch setup mistakes early.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useAuth()
 */

import { useContext } from 'react'
import { AuthContext } from '../auth/AuthContext'

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth
