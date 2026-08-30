/**
 * RegisterPage.jsx
 *
 * Functional registration form. On success, the user is redirected to /dashboard.
 * Uses AuthContext.register which handles token storage internally.
 * Displays field-level validation errors from both client and server.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const INITIAL_FORM = {
  email: '',
  username: '',
  first_name: '',
  last_name: '',
  password: '',
  password2: '',
}

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function validate() {
    const errs = {}
    if (!formData.email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address.'
    if (!formData.username.trim()) errs.username = 'Username is required.'
    if (!formData.password) errs.password = 'Password is required.'
    if (!formData.password2) errs.password2 = 'Please confirm your password.'
    else if (formData.password !== formData.password2) errs.password2 = 'Passwords do not match.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      await register(formData)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const mapped = {}
        // Django returns field errors as arrays
        const fields = ['email', 'username', 'password', 'password2', 'first_name', 'last_name']
        fields.forEach((field) => {
          if (data[field]) {
            mapped[field] = Array.isArray(data[field]) ? data[field][0] : data[field]
          }
        })
        if (data.detail) mapped.general = data.detail
        if (data.non_field_errors) mapped.general = data.non_field_errors[0]
        setErrors(Object.keys(mapped).length > 0 ? mapped : { general: 'Registration failed. Please try again.' })
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
        <h1 className="auth-card__title">Create your account</h1>
        <p className="auth-card__subtitle">Start organizing your academic life with NOTIVA</p>

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
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              autoComplete="username"
              disabled={submitting}
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="first_name">First name</label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First"
                autoComplete="given-name"
                disabled={submitting}
              />
              {errors.first_name && <span className="field-error">{errors.first_name}</span>}
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="last_name">Last name</label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last"
                autoComplete="family-name"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={submitting}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password2">Confirm password</label>
            <input
              id="password2"
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={submitting}
            />
            {errors.password2 && <span className="field-error">{errors.password2}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
