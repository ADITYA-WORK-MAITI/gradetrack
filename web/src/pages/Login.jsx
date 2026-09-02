import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { BrandMark } from '../components/AppBar'
import { Banner, Field } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } })
      login(token, user)
      navigate(user.must_change_password ? '/account/password' : `/${user.role}`)
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
          <p>Sign in to continue</p>
        </div>
        <form className="form-stack" onSubmit={submit} noValidate>
          {location.state?.message && <Banner kind="success">{location.state.message}</Banner>}
          {error && <Banner kind="error">{error}</Banner>}
          <Field id="email" label="Email">
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field id="password" label="Password">
            <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-foot">No account? <Link to="/register">Create one</Link></p>
      </div>
    </div>
  )
}
