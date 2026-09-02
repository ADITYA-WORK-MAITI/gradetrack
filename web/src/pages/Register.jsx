import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { BrandMark } from '../components/AppBar'
import { Banner, Field } from '../components/ui'

// Public sign-up creates student accounts only; staff accounts are created by an admin.
export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', roll_no: '' })
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const touch = (k) => () => setTouched({ ...touched, [k]: true })
  const pwShort = form.password.length > 0 && form.password.length < 8
  const emailBad = touched.email && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (pwShort || emailBad) return
    setBusy(true)
    try {
      await api('/auth/register', { method: 'POST', body: form })
      navigate('/login', { state: { message: 'Account created — sign in to continue.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-wordmark">
          <BrandMark />
          <h1>GradeTrack</h1>
          <p>Create your student account</p>
        </div>
        <form className="form-stack" onSubmit={submit} noValidate>
          {error && <Banner kind="error">{error}</Banner>}
          <Field id="name" label="Full name">
            <input id="name" className="input" value={form.name} onChange={set('name')} required autoFocus />
          </Field>
          <Field id="email" label="Email" error={emailBad ? 'Enter a valid email address' : ''}>
            <input id="email" className="input" type="email" value={form.email} onChange={set('email')} onBlur={touch('email')} aria-invalid={!!emailBad} required />
          </Field>
          <Field id="roll" label="Roll number" hint="Optional — as shown on your student ID">
            <input id="roll" className="input" value={form.roll_no} onChange={set('roll_no')} />
          </Field>
          <Field id="password" label="Password" hint="At least 8 characters" error={pwShort ? 'Password must be at least 8 characters' : ''}>
            <input id="password" className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={pwShort} required />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !form.name || !form.email || !form.password}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="auth-foot">Teacher or admin? Ask an administrator for an account.</p>
        <p className="auth-foot" style={{ marginTop: 8 }}>Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
