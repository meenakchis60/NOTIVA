/**
 * authService.js
 *
 * All API calls related to authentication and user profile.
 * Uses the shared axiosInstance (with JWT interceptors).
 */

import axiosInstance from './axiosInstance'

const authService = {
  /**
   * Register a new user.
   * @param {Object} data - { email, username, password, password2, first_name?, last_name? }
   * @returns Promise resolving to { user, access, refresh, message }
   */
  register: (data) => axiosInstance.post('/auth/register/', data),

  /**
   * Login with email and password.
   * @param {Object} data - { email, password }
   * @returns Promise resolving to { user, access, refresh }
   */
  login: (data) => axiosInstance.post('/auth/login/', data),

  /**
   * Logout — blacklists the refresh token on the server.
   * @param {string} refreshToken
   */
  logout: (refreshToken) => axiosInstance.post('/auth/logout/', { refresh: refreshToken }),

  /**
   * Refresh the access token.
   * @param {string} refreshToken
   * @returns Promise resolving to { access, refresh? }
   */
  refreshToken: (refreshToken) =>
    axiosInstance.post('/auth/token/refresh/', { refresh: refreshToken }),

  /**
   * Get the currently authenticated user's basic info.
   * @returns Promise resolving to user object
   */
  getMe: () => axiosInstance.get('/auth/me/'),

  /**
   * Get the current user's profile.
   * @returns Promise resolving to profile object
   */
  getProfile: () => axiosInstance.get('/auth/profile/'),

  /**
   * Update profile fields (partial update).
   * @param {Object} data - Any subset of profile fields
   */
  updateProfile: (data) => axiosInstance.patch('/auth/profile/', data),

  /**
   * Upload or replace profile image.
   * @param {FormData} formData - Must include 'profile_image' file field
   */
  uploadProfileImage: (formData) =>
    axiosInstance.post('/auth/profile/image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /**
   * Change the user's password.
   * @param {Object} data - { old_password, new_password, new_password2 }
   */
  changePassword: (data) => axiosInstance.post('/auth/change-password/', data),
}

export default authService
