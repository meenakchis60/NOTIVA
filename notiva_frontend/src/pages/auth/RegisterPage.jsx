/**
 * RegisterPage.jsx
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import authService from '../../api/authService'
import { Loader2 } from 'lucide-react'

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    
    const newErrors = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required.'
    if (!formData.email.trim()) newErrors.email = 'Email is required.'
    if (!formData.password) newErrors.password = 'Password is required.'
    if (formData.password && formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters.'
    
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors)

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        email: formData.email.trim(),
        username: formData.email.trim(),
        password2: formData.password
      }
      await authService.register(payload)
      setSuccess(true)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const mapped = {}
        if (data.email) mapped.email = Array.isArray(data.email) ? data.email[0] : data.email
        if (data.password) mapped.password = Array.isArray(data.password) ? data.password[0] : data.password
        if (data.detail) mapped.general = data.detail
        if (data.non_field_errors) mapped.general = data.non_field_errors[0]
        
        // If we still don't have a general error but we have specific field errors,
        // display the first one clearly in the general error box as requested.
        if (!mapped.general) {
          const firstKey = Object.keys(data)[0]
          if (firstKey) {
             const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey]
             // Specifically matching the requested format: "Registration failed: ..."
             mapped.general = `Registration failed: ${msg}`
          } else {
             mapped.general = 'Registration failed.'
          }
        }
        
        setErrors(mapped)
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
            <h1 className="text-2xl font-bold tracking-wide m-0" style={{ color: '#fff', margin: 0 }}>Create an account</h1>
          </div>
        </div>
        
        <p className="auth-card__subtitle text-muted text-center mb-6">Join NOTIVA to start managing your studies</p>

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-4 rounded-lg bg-surface border font-medium text-success text-center">
              Account created successfully!
            </div>
            <Link to="/login" className="btn-primary w-full p-3 block text-center mt-4">Go to Sign in</Link>
          </div>
        ) : (
          <>
            {errors.general && (
              <div className="form-error mb-4 p-3 rounded bg-danger text-danger border font-medium">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group flex-col gap-2">
                  <label htmlFor="first_name" className="font-medium text-sm">First name</label>
                  <input id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} className="p-3 border rounded-lg w-full" disabled={submitting} />
                  {errors.first_name && <span className="field-error text-danger text-sm">{errors.first_name}</span>}
                </div>
                <div className="form-group flex-col gap-2">
                  <label htmlFor="last_name" className="font-medium text-sm">Last name</label>
                  <input id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} className="p-3 border rounded-lg w-full" disabled={submitting} />
                </div>
              </div>

              <div className="form-group flex-col gap-2">
                <label htmlFor="email" className="font-medium text-sm">Email address</label>
                <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} className="p-3 border rounded-lg w-full" disabled={submitting} />
                {errors.email && <span className="field-error text-danger text-sm">{errors.email}</span>}
              </div>

              <div className="form-group flex-col gap-2">
                <label htmlFor="password" className="font-medium text-sm">Password</label>
                <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} className="p-3 border rounded-lg w-full" disabled={submitting} />
                {errors.password && <span className="field-error text-danger text-sm">{errors.password}</span>}
              </div>

              <button type="submit" className="btn-primary w-full mt-4 flex items-center justify-center gap-2 p-3" disabled={submitting}>
                {submitting ? <Loader2 className="loading-spinner w-5 h-5" /> : null}
                {submitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer text-center mt-6 text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
