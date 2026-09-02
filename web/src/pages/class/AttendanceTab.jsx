import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { Card, EmptyState, Field } from '../../components/ui'
import AttendanceLine from '../../components/charts/AttendanceLine'
import AttendanceHeatmap from '../../components/charts/AttendanceHeatmap'
import { downloadCsv } from '../../lib/csv'
import { attendanceByDate, attendanceMonths, monthlyRegister } from '../../lib/stats'

const today = () => new Date().toISOString().slice(0, 10)
const monthLabel = (ym) => new Date(ym + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

export default function AttendanceTab({ cls, role, roster, attendance, reload }) {
  if (role === 'student') {
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date))
    return (
      <div className="stack">
        <Card title="Your attendance">
          <AttendanceHeatmap records={attendance} />
        </Card>
        <Card title="Records" subtitle={`${attendance.length} sessions`}>
          {sorted.length === 0 ? <EmptyState compact title="No attendance recorded yet" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {sorted.map((a) => (
                    <tr key={a.id}><td>{a.date}</td><td><span className={`chip ${a.status === 'present' ? 'chip-success' : 'chip-danger'}`}>{a.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    )
  }

  const byDate = attendanceByDate(attendance).reverse()
  return (
    <div className="stack">
      <Card title="Attendance trend">
        <AttendanceLine records={attendance} />
      </Card>
      {role === 'teacher' && <TakeAttendance cls={cls} roster={roster} attendance={attendance} reload={reload} />}
      <Register cls={cls} roster={roster} attendance={attendance} />
      <Card title="Recorded sessions" subtitle={`${byDate.length} date${byDate.length === 1 ? '' : 's'}`}>
        {byDate.length === 0 ? <EmptyState compact title="No attendance recorded yet" hint={role === 'teacher' ? 'Take attendance above to start the register.' : ''} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th className="num">Present</th><th className="num">Absent</th><th className="num">Attendance</th></tr></thead>
              <tbody>
                {byDate.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td className="num">{d.present}</td>
                    <td className="num">{d.total - d.present}</td>
                    <td className="num">{d.pct}%</td>
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

// Month picker → students × session dates grid, read-only, with totals and CSV export.
function Register({ cls, roster, attendance }) {
  const months = useMemo(() => attendanceMonths(attendance), [attendance])
  const [month, setMonth] = useState(months[0] || '')
  useEffect(() => { if (!months.includes(month)) setMonth(months[0] || '') }, [months]) // eslint-disable-line react-hooks/exhaustive-deps

  // Include inactive students only if they have records this month.
  const reg = useMemo(() => {
    const r = monthlyRegister(attendance, roster, month)
    return { ...r, rows: r.rows.filter((row) => row.active || row.recorded > 0) }
  }, [attendance, roster, month])

  const exportCsv = () => {
    const header = ['Student', ...reg.dates, 'Present', 'Sessions', 'Percent']
    const rows = reg.rows.map((r) => [r.active ? r.name : `${r.name} (inactive)`, ...r.cells.map((c) => c === 'present' ? 'P' : c === 'absent' ? 'A' : ''), r.present, r.recorded, r.recorded ? Math.round((r.present / r.recorded) * 1000) / 10 : ''])
    const totals = ['Present / total', ...reg.totals.map((t) => `${t.present}/${t.total}`), '', '', '']
    downloadCsv(`${cls.name} register ${month}`, [header, ...rows, totals])
  }

  return (
    <Card
      title="Monthly register"
      subtitle="✓ present · ✗ absent · – not recorded"
      actions={
        <div className="filters">
          <Field id="reg-month" label="Month">
            <select id="reg-month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} disabled={months.length === 0}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </Field>
          <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={reg.dates.length === 0}>Export CSV</button>
        </div>
      }
    >
      {reg.dates.length === 0 ? <EmptyState compact title="No sessions recorded" hint="The register fills in as attendance is taken." /> : (
        <div className="table-wrap">
          <table className="register">
            <thead>
              <tr>
                <th className="name">Student</th>
                {reg.dates.map((d) => <th key={d} title={d}>{Number(d.slice(8, 10))}</th>)}
                <th>Present</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {reg.rows.map((r) => (
                <tr key={r.student_id} className={r.active ? '' : 'inactive'}>
                  <td className="name">{r.name}{r.active ? '' : ' (inactive)'}</td>
                  {r.cells.map((c, i) => (
                    <td key={i} className={c === 'present' ? 'p' : c === 'absent' ? 'a' : 'n'} aria-label={c ?? 'not recorded'}>{c === 'present' ? '✓' : c === 'absent' ? '✗' : '–'}</td>
                  ))}
                  <td>{r.present} / {r.recorded}</td>
                  <td>{r.recorded ? Math.round((r.present / r.recorded) * 100) : '–'}{r.recorded ? '%' : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="name">Present / total</td>
                {reg.totals.map((t) => <td key={t.date}>{t.present}/{t.total}</td>)}
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}

function TakeAttendance({ cls, roster, attendance, reload }) {
  const toast = useToast()
  const [date, setDate] = useState(today())
  const [present, setPresent] = useState({})
  const [busy, setBusy] = useState(false)
  const active = roster.filter((e) => e.student_active !== false)
  const future = date > today()

  // Preload the checkboxes from whatever is already recorded for the chosen date.
  useEffect(() => {
    const recorded = Object.fromEntries(attendance.filter((a) => a.date === date).map((a) => [a.student_id, a.status === 'present']))
    setPresent(Object.fromEntries(active.map((e) => [e.student_id, recorded[e.student_id] ?? true])))
  }, [date, attendance, roster]) // eslint-disable-line react-hooks/exhaustive-deps

  const alreadyRecorded = attendance.some((a) => a.date === date)
  const presentCount = Object.values(present).filter(Boolean).length
  const setAll = (v) => setPresent(Object.fromEntries(active.map((e) => [e.student_id, v])))

  const save = (e) => {
    e.preventDefault()
    if (future) return
    const entries = active.map((r) => ({ student_id: r.student_id, status: present[r.student_id] ? 'present' : 'absent' }))
    setBusy(true)
    api(`/classes/${cls.id}/attendance`, { method: 'POST', body: { date, entries } })
      .then(reload)
      .then(() => toast(`Saved attendance for ${date} — ${presentCount} of ${active.length} present`))
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setBusy(false))
  }

  return (
    <Card title="Take attendance" subtitle={alreadyRecorded ? 'This date is already recorded — saving will overwrite it' : 'Pick any past date or today, then untick anyone who is absent'}>
      {active.length === 0 ? <EmptyState compact title="No active students enrolled" /> : (
        <form className="form-stack" onSubmit={save}>
          <div className="form-row">
            <Field id="att-date" label="Session date" error={future ? 'Attendance cannot be recorded for a future date' : ''}>
              <input id="att-date" className="input" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={future} required />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn btn-text btn-sm" onClick={() => setAll(true)}>Mark all present</button>
              <button type="button" className="btn btn-text btn-sm" onClick={() => setAll(false)}>Mark all absent</button>
            </div>
          </div>
          <div className="checklist">
            {active.map((r) => (
              <label key={r.student_id}>
                <input type="checkbox" checked={!!present[r.student_id]} onChange={(e) => setPresent({ ...present, [r.student_id]: e.target.checked })} />
                <span>{r.student_name}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !date || future}>{busy ? 'Saving…' : 'Save attendance'}</button>
            <span className="muted">{presentCount} of {active.length} present</span>
          </div>
        </form>
      )}
    </Card>
  )
}
