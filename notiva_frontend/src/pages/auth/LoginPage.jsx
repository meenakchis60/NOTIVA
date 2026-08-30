/**
 * LoginPage.jsx
 *
 * Functional login form. On success, the user is redirected to /dashboard.
 * Uses AuthContext.login which handles token storage internally.
 * Displays field-level and general API errors.
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect back to the page the user was trying to reach (if any)
  const from = location.state?.from?.pathname || '/dashboard'

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear the specific field error when the user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    // Basic client-side validation
    const newErrors = {}
    if (!formData.email.trim()) newErrors.email = 'Email is required.'
    if (!formData.password) newErrors.password = 'Password is required.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      await login(formData.email.trim(), formData.password)
      navigate(from, { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (data) {
        // Map Django error keys to form fields
        const mapped = {}
        if (data.detail) mapped.general = data.detail
        if (data.email) mapped.email = Array.isArray(data.email) ? data.email[0] : data.email
        if (data.password) mapped.password = Array.isArray(data.password) ? data.password[0] : data.password
        if (data.non_field_errors) mapped.general = data.non_field_errors[0]
        setErrors(Object.keys(mapped).length > 0 ? mapped : { general: 'Login failed. Please try again.' })
      } else {
        setErrors({ general: 'Unable to connect. Check your internet connection.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to your NOTIVA account</p>

        {errors.general && (
          <div className="form-error" role="alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={submitting}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Do not have an account?{' '}
          <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
