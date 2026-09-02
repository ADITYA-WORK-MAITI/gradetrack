import { pct } from '../../api'
import { AtRiskBadge, Card, EmptyState } from '../../components/ui'
import PerformanceBar from '../../components/charts/PerformanceBar'
import PerformanceScatter from '../../components/charts/PerformanceScatter'
import SparklineGrid from '../../components/charts/SparklineGrid'
import TermComparison from '../../components/charts/TermComparison'
import { downloadCsv } from '../../lib/csv'
import { isAtRisk } from '../../lib/stats'
import StudentSummary from './StudentSummary'

export default function PerformanceTab({ cls, role, marks, attendance, perf }) {
  if (role === 'student') {
    return (
      <Card title="Your performance" subtitle="How you're doing in this class">
        <StudentSummary marks={marks} attendance={attendance} perf={perf[0] || null} />
      </Card>
    )
  }

  const rows = perf.map((p) => ({ ...p, risk: isAtRisk(p), label: p.is_active === false ? `${p.name} (inactive)` : p.name }))
  const atRisk = rows.filter((r) => r.risk && r.is_active !== false).length
  const activeRows = rows.filter((r) => r.is_active !== false)

  const exportCsv = () => downloadCsv(`${cls.name} performance`, [
    ['Student', 'Status', 'Average %', 'Marks', 'Missing', 'Attendance %', 'Present', 'Sessions', 'At risk'],
    ...rows.map((p) => [p.label, p.is_active === false ? 'inactive' : 'active', p.average_pct ?? '', p.mark_count, p.missing_count, p.attendance_pct ?? '', p.present_count, p.attendance_count, p.risk ? 'yes' : 'no']),
  ])

  return (
    <div className="stack">
      <Card title="Class overview" subtitle="Average score and attendance per active student">
        <div className="grid-2">
          <PerformanceBar rows={activeRows} />
          <PerformanceScatter rows={activeRows} />
        </div>
      </Card>

      <Card title="Trends" subtitle="Each student's marks over time (most recent on the right) · red = at risk">
        <SparklineGrid perf={perf} marks={marks} />
      </Card>

      <Card title="Terms">
        <TermComparison marks={marks.filter((m) => activeRows.some((r) => r.student_id === m.student_id))} scope="class" />
      </Card>

      <Card
        title="Students"
        subtitle="At risk = average under 40% or attendance under 75% (inactive students shown for history, not counted)"
        actions={
          <div className="row">
            <span className={`risk-count ${atRisk === 0 ? 'none' : ''}`}>
              {atRisk === 0 ? 'No students at risk' : `${atRisk} student${atRisk === 1 ? '' : 's'} at risk`}
            </span>
            <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</button>
          </div>
        }
      >
        {rows.length === 0 ? <EmptyState compact title="No students enrolled" hint="Enrol students from the Roster tab." /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th className="num">Average</th>
                  <th className="num">Marks</th>
                  <th className="num">Missing</th>
                  <th className="num">Attendance</th>
                  <th className="num">Present / sessions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.student_id} className={p.risk && p.is_active !== false ? 'at-risk' : ''}>
                    <td className={p.is_active === false ? 'name-inactive' : ''}>{p.label}</td>
                    <td className="num">{pct(p.average_pct)}</td>
                    <td className="num">{p.mark_count}</td>
                    <td className="num">{p.missing_count ? <span className="chip chip-danger">{p.missing_count}</span> : <span className="muted">0</span>}</td>
                    <td className="num">{pct(p.attendance_pct)}</td>
                    <td className="num">{p.present_count} / {p.attendance_count}</td>
                    <td>{p.is_active === false ? <span className="chip chip-neutral">inactive</span> : p.risk ? <AtRiskBadge /> : <span className="muted small">OK</span>}</td>
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
