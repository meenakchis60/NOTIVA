/**
 * constants.js
 * Application-wide constants.
 * These are referenced by services, components, and stores.
 */

// Token storage keys — must match axiosInstance.js
export const TOKEN_KEYS = {
  access: 'notiva_access',
  refresh: 'notiva_refresh',
  user: 'notiva_user',
}

// API base path (handled by Vite proxy in dev; configure for prod)
export const API_BASE = '/api/v1'

// Pagination
export const DEFAULT_PAGE_SIZE = 20

// Theme values
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
}

// Notification polling interval (ms) — used in Phase 6
export const NOTIFICATION_POLL_INTERVAL = 30_000 // 30 seconds
