import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { Card, EmptyState, Field } from '../../components/ui'

// Roster for teacher (read-only) and admin (enrol / remove). Inactive students are
// hidden by default; their history stays on the other tabs.
export default function RosterTab({ cls, role, roster, reload }) {
  const toast = useToast()
  const isAdmin = role === 'admin'
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [filter, setFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    if (isAdmin) api('/users').then((us) => setStudents(us.filter((u) => u.role === 'student' && u.is_active))).catch((e) => toast(e.message, 'error'))
  }, [isAdmin, toast])

  const run = (promise, okMessage) =>
    promise.then(reload).then(() => { toast(okMessage); return true }).catch((e) => { toast(e.message, 'error'); return false })

  const enrolledIds = new Set(roster.map((e) => e.student_id))
  const available = students.filter((s) => !enrolledIds.has(s.id))
  const inactiveCount = roster.filter((e) => e.student_active === false).length
  const shown = roster
    .filter((e) => showInactive || e.student_active !== false)
    .filter((e) => e.student_name.toLowerCase().includes(filter.trim().toLowerCase()) || e.student_email.toLowerCase().includes(filter.trim().toLowerCase()))

  const add = (e) => {
    e.preventDefault()
    const s = students.find((x) => x.id === Number(studentId))
    run(api(`/classes/${cls.id}/enrollments`, { method: 'POST', body: { student_id: Number(studentId) } }), `Enrolled ${s?.name}`)
      .then((ok) => ok && setStudentId(''))
  }

  return (
    <div className="stack">
      {isAdmin && (
        <Card title="Enrol a student" subtitle="Only active student accounts are listed">
          {available.length === 0 ? <EmptyState compact title="Every active student is already enrolled" /> : (
            <form className="form-row" onSubmit={add}>
              <Field id="enrol-student" label="Student">
                <select id="enrol-student" className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                  <option value="">Choose…</option>
                  {available.map((s) => <option key={s.id} value={s.id}>{s.name}{s.roll_no ? ` (${s.roll_no})` : ''} — {s.email}</option>)}
                </select>
              </Field>
              <button type="submit" className="btn btn-primary" disabled={!studentId}>Enrol</button>
            </form>
          )}
        </Card>
      )}
      <Card
        title="Students"
        subtitle={`${roster.length - inactiveCount} active${inactiveCount ? ` · ${inactiveCount} inactive` : ''}`}
        actions={
          <div className="filters">
            <Field id="roster-filter" label="Find">
              <input id="roster-filter" className="input" placeholder="Name or email" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 220 }} />
            </Field>
            {inactiveCount > 0 && (
              <label className="switch" style={{ paddingBottom: 8 }}>
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                <span className="muted small">Show inactive</span>
              </label>
            )}
          </div>
        }
      >
        {shown.length === 0 ? <EmptyState compact title={roster.length === 0 ? 'No students enrolled' : 'No students match'} hint={roster.length === 0 ? (isAdmin ? 'Enrol the first student above.' : 'An admin can enrol students into this class.') : ''} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td className={e.student_active === false ? 'name-inactive' : ''}>{e.student_name}{e.student_active === false ? ' (inactive)' : ''}</td>
                    <td className="muted">{e.student_email}</td>
                    <td><span className={`chip ${e.student_active === false ? 'chip-neutral' : 'chip-success'}`}>{e.student_active === false ? 'inactive' : 'active'}</span></td>
                    {isAdmin && (
                      <td className="actions">
                        {confirmId === e.id ? (
                          <>
                            <span className="muted small">Remove from class? </span>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => run(api(`/enrollments/${e.id}`, { method: 'DELETE' }), `Removed ${e.student_name}`).then(() => setConfirmId(null))}>Remove</button>{' '}
                            <button type="button" className="btn btn-text btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-text btn-sm danger" onClick={() => setConfirmId(e.id)}>Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
