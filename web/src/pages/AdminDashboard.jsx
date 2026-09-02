import { useEffect, useRef, useState } from 'react'
import { api, pct } from '../api'
import { useAuth } from '../AuthContext'
import ClassCard from '../components/ClassCard'
import { useToast } from '../components/Toast'
import Tabs from '../components/Tabs'
import { Banner, Card, EmptyState, Field, Loading, Stat } from '../components/ui'
import { ClassOverviewBars, TeacherLoadBar } from '../components/charts/AdminCharts'
import { parseCsv, rowsToStudents } from '../lib/csv'

export default function AdminDashboard() {
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [classes, setClasses] = useState(null)
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')

  const load = () =>
    Promise.all([api('/users'), api('/classes'), api('/admin/overview')])
      .then(([u, c, o]) => { setUsers(u); setClasses(c); setOverview(o); setError('') })
      .catch((e) => { setError(e.message); setUsers([]); setClasses([]) })

  useEffect(() => { load() }, [])

  // Run a mutation: refresh on success (with a toast), surface the error otherwise.
  const run = (promise, okMessage) =>
    promise.then(load).then(() => { if (okMessage) toast(okMessage); return true }).catch((e) => { toast(e.message, 'error'); return false })

  const teachers = (users || []).filter((u) => u.role === 'teacher' && u.is_active)
  const teacherName = (id) => (users || []).find((t) => t.id === id)?.name
  const counts = Object.fromEntries((overview?.per_class || []).map((c) => [c.class_id, c.enrolled]))

  if (users === null || classes === null) return <div className="page"><Loading /></div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>School overview</h1>
          <p>Headline numbers across every class; management tools live under Manage.</p>
        </div>
      </div>
      <Tabs tabs={[{ id: 'overview', label: 'Overview' }, { id: 'manage', label: 'Manage' }]} value={tab} onChange={setTab} />
      <Banner kind="error">{error}</Banner>

      {tab === 'overview' && (
        <div className="stack">
          {overview && (
            <div className="stat-row">
              <Stat label="Students" value={overview.students} sub={`${overview.active_students} active`} />
              <Stat label="Teachers" value={overview.teachers} />
              <Stat label="Classes" value={overview.classes} />
              <Stat label="School average" value={pct(overview.school_avg_pct)} sub="mean of student averages" />
              <Stat label="Attendance" value={pct(overview.school_attendance_pct)} sub="sessions present" />
              <Stat label="At risk" value={overview.at_risk_count} sub="avg < 40% or attendance < 75%" danger={overview.at_risk_count > 0} />
            </div>
          )}
          {overview && (
            <Card>
              <div className="grid-2">
                <ClassOverviewBars perClass={overview.per_class} />
                <TeacherLoadBar perClass={overview.per_class} />
              </div>
            </Card>
          )}
          <div>
            <h2 style={{ marginBottom: 16 }}>All classes</h2>
            {classes.length === 0 ? <EmptyState title="No classes yet" hint="Create the first class under Manage." /> : (
              <div className="class-grid">
                {classes.map((c) => <ClassCard key={c.id} cls={c} teacherName={teacherName(c.teacher_id)} studentCount={counts[c.id]} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <div className="stack">
          <Card title="Classes" subtitle="Create classes and assign teachers">
            <CreateClass teachers={teachers} run={run} />
            {classes.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table className="table">
                  <thead><tr><th>ID</th><th>Name</th><th>Subject</th><th>Year</th><th>Teacher</th><th className="num">Students</th></tr></thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id}>
                        <td className="muted">{c.id}</td>
                        <td>{c.name}</td>
                        <td>{c.subject}</td>
                        <td className="muted">{c.academic_year}</td>
                        <td>
                          <select className="input input-sm" aria-label={`Teacher for ${c.name}`} value={c.teacher_id}
                            onChange={(e) => run(api(`/classes/${c.id}`, { method: 'PUT', body: { name: c.name, subject: c.subject, teacher_id: Number(e.target.value), academic_year: c.academic_year } }), `Reassigned ${c.name}`)}>
                            {!teachers.some((t) => t.id === c.teacher_id) && <option value={c.teacher_id}>{teacherName(c.teacher_id)} (inactive)</option>}
                            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        <td className="num">{counts[c.id] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <UsersCard run={run} />
          <CreateUser run={run} />
          <ImportStudents run={run} />
        </div>
      )}
    </div>
  )
}

function CreateClass({ teachers, run }) {
  const blank = { name: '', subject: '', teacher_id: '', academic_year: '2026-27' }
  const [form, setForm] = useState(blank)
  const submit = (e) => {
    e.preventDefault()
    run(api('/classes', { method: 'POST', body: { ...form, teacher_id: Number(form.teacher_id) } }), `Created ${form.name}`)
      .then((ok) => ok && setForm(blank))
  }
  return (
    <form className="form-row" onSubmit={submit}>
      <Field id="cls-name" label="Class name">
        <input id="cls-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </Field>
      <Field id="cls-subject" label="Subject">
        <input id="cls-subject" className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
      </Field>
      <Field id="cls-year" label="Academic year">
        <input id="cls-year" className="input" style={{ width: 110 }} value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
      </Field>
      <Field id="cls-teacher" label="Teacher">
        <select id="cls-teacher" className="input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} required>
          <option value="">Choose…</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <button type="submit" className="btn btn-primary" disabled={!form.name || !form.subject || !form.teacher_id}>Create class</button>
    </form>
  )
}

// Users table with server-side search, active filter/toggle and password reset.
function UsersCard({ run }) {
  const { user: me } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [active, setActive] = useState('all') // all | active | inactive
  const [role, setRole] = useState('all')
  const [rows, setRows] = useState(null)
  const [reset, setReset] = useState(null) // { name, temp }

  const search = (query) => api(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`).then(setRows).catch((e) => toast(e.message, 'error'))

  // Debounced server search; also refetch after any mutation via `run`.
  useEffect(() => {
    const t = setTimeout(() => search(q.trim()), q ? 250 : 0)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = (promise, msg) => run(promise, msg).then((ok) => { search(q.trim()); return ok })

  const toggle = (u) => mutate(api(`/users/${u.id}/active`, { method: 'PUT', body: { is_active: !u.is_active } }), `${u.is_active ? 'Deactivated' : 'Reactivated'} ${u.name}`)
  const resetPw = (u) =>
    api(`/users/${u.id}/password`, { method: 'PUT', body: {} })
      .then((r) => { setReset({ name: u.name, temp: r.temp_password }); toast(`Temporary password issued for ${u.name}`) })
      .catch((e) => toast(e.message, 'error'))

  const shown = (rows || []).filter((u) =>
    (active === 'all' || (active === 'active') === u.is_active) && (role === 'all' || u.role === role))

  return (
    <Card
      title="Users"
      subtitle={rows ? `${shown.length} of ${rows.length} shown` : ''}
      actions={
        <div className="filters">
          <Field id="u-q" label="Search">
            <input id="u-q" className="input" placeholder="Name, email or roll no" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          </Field>
          <Field id="u-role" label="Role">
            <select id="u-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">All roles</option><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option>
            </select>
          </Field>
          <Field id="u-active" label="Status">
            <select id="u-active" className="input" value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      }
    >
      {reset && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="info">
            <span>Temporary password for <strong>{reset.name}</strong>: <code className="pw-reveal">{reset.temp}</code> — share it privately; they must change it at next sign-in.</span>
            <button type="button" className="btn btn-text btn-sm" onClick={() => setReset(null)}>Dismiss</button>
          </Banner>
        </div>
      )}
      {rows === null ? <Loading /> : shown.length === 0 ? <EmptyState compact title="No users match" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Roll no</th><th>Role</th><th>Active</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td className="muted">{u.id}</td>
                  <td className={u.is_active ? '' : 'name-inactive'}>{u.name}{u.is_active ? '' : ' (inactive)'}{u.must_change_password && <span className="chip chip-neutral" style={{ marginLeft: 8 }}>temp password</span>}</td>
                  <td>{u.email}</td>
                  <td className="muted">{u.roll_no ?? '—'}</td>
                  <td><span className="chip chip-neutral">{u.role}</span></td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={u.is_active} disabled={u.id === me.id} onChange={() => toggle(u)} aria-label={`${u.name} active`} />
                      <span className="muted small">{u.is_active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </td>
                  <td className="muted">{u.created_at.slice(0, 10)}</td>
                  <td className="actions"><button type="button" className="btn btn-text btn-sm" onClick={() => resetPw(u)}>Reset password</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function CreateUser({ run }) {
  const toast = useToast()
  const blank = { name: '', email: '', role: 'teacher', roll_no: '', phone: '' }
  const [form, setForm] = useState(blank)
  const [made, setMade] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    api('/users', { method: 'POST', body: form })
      .then((r) => { setMade({ name: r.user.name, temp: r.temp_password }); setForm(blank); toast(`Created ${r.user.name}`); run(Promise.resolve()) })
      .catch((err) => toast(err.message, 'error'))
  }
  return (
    <Card title="Create a user" subtitle="Teachers and admins are created here with a temporary password they must change at first sign-in">
      {made && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="success">
            <span>Account for <strong>{made.name}</strong> created. Temporary password: <code className="pw-reveal">{made.temp}</code></span>
            <button type="button" className="btn btn-text btn-sm" onClick={() => setMade(null)}>Dismiss</button>
          </Banner>
        </div>
      )}
      <form className="form-row" onSubmit={submit}>
        <Field id="nu-name" label="Full name"><input id="nu-name" className="input" value={form.name} onChange={set('name')} required /></Field>
        <Field id="nu-email" label="Email"><input id="nu-email" className="input" type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field id="nu-role" label="Role">
          <select id="nu-role" className="input" value={form.role} onChange={set('role')}>
            <option value="teacher">Teacher</option><option value="admin">Admin</option><option value="student">Student</option>
          </select>
        </Field>
        {form.role === 'student' && <Field id="nu-roll" label="Roll no"><input id="nu-roll" className="input" style={{ width: 110 }} value={form.roll_no} onChange={set('roll_no')} /></Field>}
        <Field id="nu-phone" label="Phone"><input id="nu-phone" className="input" style={{ width: 140 }} value={form.phone} onChange={set('phone')} /></Field>
        <button type="submit" className="btn btn-primary" disabled={!form.name || !form.email}>Create user</button>
      </form>
    </Card>
  )
}

// CSV → parsed in the browser → POST /users/import → per-row results.
function ImportStudents({ run }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const [preview, setPreview] = useState([])
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const onFile = (e) => {
    const f = e.target.files?.[0]
    setResult(null)
    if (!f) return setPreview([])
    f.text().then((t) => setPreview(rowsToStudents(parseCsv(t)))).catch(() => toast('Could not read that file', 'error'))
  }
  const submit = () => {
    setBusy(true)
    api('/users/import', { method: 'POST', body: preview })
      .then((r) => { setResult(r); setPreview([]); if (fileRef.current) fileRef.current.value = ''; toast(`Imported ${r.created} student${r.created === 1 ? '' : 's'}`); run(Promise.resolve()) })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setBusy(false))
  }
  const statusChip = (s) => <span className={`chip ${s === 'created' ? 'chip-success' : 'chip-danger'}`}>{s}</span>

  return (
    <Card title="Import students from CSV" subtitle="Columns: name, email, roll_no (header row optional). Accounts get one shared temporary password.">
      <div className="form-row">
        <Field id="imp-file" label="CSV file">
          <input id="imp-file" ref={fileRef} className="input" type="file" accept=".csv,text/csv" onChange={onFile} style={{ paddingTop: 8 }} />
        </Field>
        <button type="button" className="btn btn-primary" disabled={preview.length === 0 || busy} onClick={submit}>{busy ? 'Importing…' : `Import ${preview.length || ''} row${preview.length === 1 ? '' : 's'}`}</button>
      </div>
      {preview.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Roll no</th></tr></thead>
            <tbody>{preview.map((r, i) => <tr key={i}><td className="muted">{i + 1}</td><td>{r.name || <span className="chip chip-danger">missing</span>}</td><td>{r.email || <span className="chip chip-danger">missing</span>}</td><td className="muted">{r.roll_no || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {result && (
        <div style={{ marginTop: 16 }} className="stack">
          <Banner kind={result.created > 0 ? 'success' : 'info'}>
            <span>{result.created} created. Shared temporary password: <code className="pw-reveal">{result.temp_password}</code></span>
          </Banner>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Roll no</th><th>Result</th></tr></thead>
              <tbody>{result.results.map((r) => <tr key={r.row}><td className="muted">{r.row}</td><td>{r.name}</td><td>{r.email}</td><td className="muted">{r.roll_no || '—'}</td><td>{statusChip(r.status)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}
