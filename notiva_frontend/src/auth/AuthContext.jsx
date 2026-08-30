/**
 * AuthContext.jsx
 *
 * Provides authentication state and actions to the entire React tree.
 *
 * State managed here:
 *  - user         : Current user object (null if not authenticated)
 *  - loading      : True while checking initial auth state on app load
 *  - isAuthenticated : Derived boolean from user !== null
 *
 * Actions:
 *  - login(email, password)    : Authenticates, stores tokens, sets user
 *  - register(data)            : Registers, stores tokens, sets user
 *  - logout()                  : Blacklists refresh token, clears state
 *  - updateUser(data)          : Updates local user state (after profile edits)
 *
 * Token storage strategy:
 *  - Tokens are stored in localStorage under 'notiva_access' and 'notiva_refresh'
 *  - On app load, we attempt to restore the session by fetching /auth/me/
 *    using the stored access token. If the token is expired, the Axios
 *    interceptor silently refreshes it.
 */

import { createContext, useState, useEffect, useCallback } from 'react'
import authService from '../api/authService'

export const AuthContext = createContext(null)

const TOKEN_KEYS = {
  access: 'notiva_access',
  refresh: 'notiva_refresh',
  user: 'notiva_user',
}

function storeTokens(access, refresh) {
  localStorage.setItem(TOKEN_KEYS.access, access)
  localStorage.setItem(TOKEN_KEYS.refresh, refresh)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access)
  localStorage.removeItem(TOKEN_KEYS.refresh)
  localStorage.removeItem(TOKEN_KEYS.user)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ---------------------------------------------------------------------------
  // On mount: restore session if a token exists
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem(TOKEN_KEYS.access)
      if (!accessToken) {
        setLoading(false)
        return
      }
      try {
        // axiosInstance interceptor will silently refresh if needed
        const response = await authService.getMe()
        setUser(response.data)
      } catch {
        // Could not restore session (refresh also failed) — clear storage
        clearTokens()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------
  const login = useCallback(async (email, password) => {
    const response = await authService.login({ email, password })
    const { user: userData, access, refresh } = response.data
    storeTokens(access, refresh)
    setUser(userData)
    return userData
  }, [])

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------
  const register = useCallback(async (data) => {
    const response = await authService.register(data)
    const { user: userData, access, refresh } = response.data
    storeTokens(access, refresh)
    setUser(userData)
    return userData
  }, [])

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh)
    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch {
      // Even if blacklisting fails, we still clear local state
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Update local user state (e.g., after a profile name change)
  // ---------------------------------------------------------------------------
  const updateUser = useCallback((data) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev))
  }, [])

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
