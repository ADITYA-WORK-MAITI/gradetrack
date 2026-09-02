import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../components/Toast'
import { Banner, Card, Field } from '../components/ui'

// Password change for every role. Also the forced screen after an admin reset:
// while must_change_password is set, the router sends every authed page here.
export default function ChangePassword() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const forced = !!user.must_change_password
  const [form, setForm] = useState({ old: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const tooShort = form.next.length > 0 && form.next.length < 8
  const mismatch = form.confirm.length > 0 && form.confirm !== form.next
  const same = form.next.length > 0 && form.next === form.old
  const ready = form.old && form.next.length >= 8 && form.confirm === form.next && !same

  const submit = async (e) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true); setError('')
    try {
      await api('/me/password', { method: 'PUT', body: { old_password: form.old, new_password: form.next } })
      updateUser({ must_change_password: false })
      toast('Password changed')
      navigate(`/${user.role}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="page-head">
        <div>
          <h1>{forced ? 'Set a new password' : 'Change password'}</h1>
          <p>{forced ? 'Your password was reset by an admin. Choose a new one to continue.' : 'Use at least 8 characters.'}</p>
        </div>
      </div>
      <Card>
        <form className="form-stack" onSubmit={submit} noValidate>
          {forced && <Banner kind="info">You can't use the rest of GradeTrack until the temporary password is replaced.</Banner>}
          {error && <Banner kind="error">{error}</Banner>}
          <Field id="pw-old" label={forced ? 'Temporary password' : 'Current password'}>
            <input id="pw-old" className="input" type="password" autoComplete="current-password" value={form.old} onChange={set('old')} required autoFocus />
          </Field>
          <Field id="pw-new" label="New password" hint="At least 8 characters" error={tooShort ? 'Too short — at least 8 characters' : same ? 'Must differ from the current password' : ''}>
            <input id="pw-new" className="input" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} aria-invalid={tooShort || same} required />
          </Field>
          <Field id="pw-confirm" label="Confirm new password" error={mismatch ? 'Passwords do not match' : ''}>
            <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={mismatch} required />
          </Field>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={!ready || busy}>{busy ? 'Saving…' : 'Save new password'}</button>
            {forced ? (
              <button type="button" className="btn btn-text" onClick={logout}>Log out</button>
            ) : (
              <button type="button" className="btn btn-text" onClick={() => navigate(-1)}>Cancel</button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
