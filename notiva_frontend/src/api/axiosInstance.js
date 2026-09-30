/**
 * axiosInstance.js
 *
 * Central Axios instance for all NOTIVA API calls.
 *
 * Features:
 *  - Base URL points to /api/v1/ (proxied to Django by Vite in dev)
 *  - Automatically attaches the JWT access token to every request
 *  - Intercepts 401 responses and attempts a silent token refresh
 *  - On refresh failure, clears local storage and redirects to /login
 *  - Prevents infinite refresh loops using a per-request retry flag
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ---------------------------------------------------------------------------
// Primary instance used by all service modules
// ---------------------------------------------------------------------------
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---------------------------------------------------------------------------
// Request interceptor — attach access token
// ---------------------------------------------------------------------------
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('notiva_access')
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor — silent token refresh on 401
// ---------------------------------------------------------------------------
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh if:
    //  1. Response is 401 (Unauthorized)
    //  2. We have not already retried this request
    //  3. A refresh token exists in storage
    const is401 = error.response?.status === 401
    const notRetried = !originalRequest._retry
    const hasRefresh = Boolean(localStorage.getItem('notiva_refresh'))

    if (is401 && notRetried && hasRefresh) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('notiva_refresh')
        const response = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        })

        const { access, refresh } = response.data
        localStorage.setItem('notiva_access', access)
        // SimpleJWT rotates the refresh token — store the new one
        if (refresh) {
          localStorage.setItem('notiva_refresh', refresh)
        }

        // Retry the original request with the new access token
        originalRequest.headers['Authorization'] = `Bearer ${access}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // Refresh failed — clear tokens and force re-login
        localStorage.removeItem('notiva_access')
        localStorage.removeItem('notiva_refresh')
        localStorage.removeItem('notiva_user')
        window.location.href = '#/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
