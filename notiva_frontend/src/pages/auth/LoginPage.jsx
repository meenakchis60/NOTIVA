/**
 * LoginPage.jsx
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import { Loader2 } from 'lucide-react'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    const newErrors = {}
    if (!formData.email.trim()) newErrors.email = 'Email is required.'
    if (!formData.password) newErrors.password = 'Password is required.'
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors)

    setSubmitting(true)
    try {
      await login(formData.email.trim(), formData.password)
      navigate(from, { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const mapped = {}
        if (data.detail) mapped.general = data.detail
        if (data.email) mapped.email = Array.isArray(data.email) ? data.email[0] : data.email
        if (data.password) mapped.password = Array.isArray(data.password) ? data.password[0] : data.password
        if (data.non_field_errors) mapped.general = data.non_field_errors[0]
        setErrors(Object.keys(mapped).length > 0 ? mapped : { general: 'Login failed.' })
      } else {
        setErrors({ general: 'Connection error.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page flex-col items-center justify-center min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="auth-card card shadow-md border rounded-lg p-6 bg-surface" style={{ width: '100%', maxWidth: '420px', margin: '2rem auto' }}>
        <div className="flex justify-center mb-4">
          <div style={{ background: 'var(--color-primary)', color: '#fff', padding: '1rem 2rem', borderRadius: '12px', width: '100%', textAlign: 'center' }}>
            <h1 className="text-3xl font-bold tracking-wide m-0" style={{ color: '#fff', margin: 0 }}>Notiva</h1>
          </div>
        </div>
        
        <p className="auth-card__subtitle text-muted text-center mb-6">Sign in to continue to your workspace</p>

        {errors.general && (
          <div className="form-error mb-4 p-3 rounded bg-danger text-danger border font-medium">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex-col gap-4">
          <div className="form-group flex-col gap-2">
            <label htmlFor="email" className="font-medium text-sm">Email address</label>
            <input
              id="email" type="email" name="email"
              value={formData.email} onChange={handleChange}
              placeholder="you@example.com" autoComplete="email" disabled={submitting}
              className="p-3 border rounded-lg w-full"
            />
            {errors.email && <span className="field-error text-danger text-sm">{errors.email}</span>}
          </div>

          <div className="form-group flex-col gap-2">
            <label htmlFor="password" className="font-medium text-sm">Password</label>
            <input
              id="password" type="password" name="password"
              value={formData.password} onChange={handleChange}
              placeholder="Enter your password" autoComplete="current-password" disabled={submitting}
              className="p-3 border rounded-lg w-full"
            />
            {errors.password && <span className="field-error text-danger text-sm">{errors.password}</span>}
          </div>

          <button type="submit" className="btn-primary w-full mt-4 flex items-center justify-center gap-2 p-3" disabled={submitting}>
            {submitting ? <Loader2 className="loading-spinner w-5 h-5" /> : null}
            {submitting ? 'Signing in...' : 'Sign in to Workspace'}
          </button>
        </form>

        <div className="auth-footer text-center mt-6 text-muted">
          Do not have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
