import { pct } from '../../api'
import { AtRiskBadge } from '../../components/ui'
import MarksLine from '../../components/charts/MarksLine'
import AttendanceHeatmap from '../../components/charts/AttendanceHeatmap'
import TermComparison from '../../components/charts/TermComparison'
import CategoryBars from '../../components/charts/CategoryBars'
import { isAtRisk, termAverages, termDelta } from '../../lib/stats'

// One student's view of one class: headline stats, standing line, marks trend,
// attendance calendar, term comparison and category breakdown.
// `perf` is the student's own performance row (or null before any data exists).
// The API returns only the student's own row, so class-wide averages are not
// available here — the standing line says so rather than inventing a number.
export default function StudentSummary({ marks, attendance, perf, compact }) {
  const risk = perf ? isAtRisk(perf) : false
  const delta = termDelta(termAverages(marks))
  return (
    <div className="stack">
      <div className="summary-head">
        <div className="summary-stats">
          <div>
            <div className="label">Average</div>
            <div className="hero-num" style={risk && perf.average_pct != null && perf.average_pct < 40 ? { color: 'var(--danger)' } : undefined}>{pct(perf?.average_pct)}</div>
            <div className="muted small">{perf?.mark_count ?? 0} mark{perf?.mark_count === 1 ? '' : 's'}{perf?.missing_count ? ` · ${perf.missing_count} missing` : ''}</div>
          </div>
          <div>
            <div className="label">Attendance</div>
            <div className="hero-num" style={risk && perf.attendance_pct != null && perf.attendance_pct < 75 ? { color: 'var(--danger)' } : undefined}>{pct(perf?.attendance_pct)}</div>
            <div className="muted small">{perf?.present_count ?? 0} of {perf?.attendance_count ?? 0} sessions</div>
          </div>
          {delta && (
            <div>
              <div className="label">{delta.latest}</div>
              <div style={{ marginTop: 6 }}>
                <span className={`delta ${delta.delta > 0 ? 'up' : delta.delta < 0 ? 'down' : ''}`} title={`${delta.latest} vs ${delta.previous}`}>
                  {delta.delta > 0 ? '↑' : delta.delta < 0 ? '↓' : '→'} {Math.abs(delta.delta)}% vs {delta.previous}
                </span>
              </div>
            </div>
          )}
        </div>
        {risk && <AtRiskBadge />}
      </div>
      <p className="standing">
        <span>Your average: <strong>{pct(perf?.average_pct)}</strong></span>
        <span className="sep">·</span>
        <span title="The API only returns your own row; class-wide averages are not shown to students.">Class average: <strong className="muted">not shared with students</strong></span>
      </p>
      <div className="grid-2">
        <MarksLine marks={marks} average={perf?.average_pct ?? null} />
        <AttendanceHeatmap records={attendance} />
      </div>
      {!compact && (
        <div className="grid-2">
          <TermComparison marks={marks} scope="personal" />
          <CategoryBars categories={perf?.categories ?? []} />
        </div>
      )}
    </div>
  )
}
