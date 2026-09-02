import { EmptyState } from '../ui'
import { currentStreak } from '../../lib/stats'

// CSS-grid calendar of one student's sessions: one cell per date, green present / red absent.
export default function AttendanceHeatmap({ records }) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const streak = currentStreak(records)
  const present = sorted.filter((r) => r.status === 'present').length

  return (
    <div className="chart-frame">
      <div className="summary-head">
        <div>
          <div className="chart-title">Attendance calendar</div>
          <div className="chart-sub">{sorted.length ? `${present} of ${sorted.length} sessions attended` : 'One cell per recorded session'}</div>
        </div>
        <div className="streak" title="Consecutive sessions present, counting back from the latest">
          <strong>{streak}</strong><span className="muted">session streak</span>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState compact title="Not enough data yet" hint="No attendance recorded for this class." />
      ) : (
        <>
          <div className="heatmap" role="list">
            {sorted.map((r) => (
              <div
                key={r.id}
                role="listitem"
                className={`heat-cell ${r.status === 'present' ? 'heat-present' : 'heat-absent'}`}
                title={`${r.date}: ${r.status}`}
                aria-label={`${r.date}: ${r.status}`}
              >
                {Number(r.date.slice(8, 10))}
              </div>
            ))}
          </div>
          <div className="heat-legend">
            <span><i style={{ background: 'var(--success)' }} />Present</span>
            <span><i style={{ background: 'var(--danger)' }} />Absent</span>
            <span className="muted">Number = day of month · hover for the date</span>
          </div>
        </>
      )}
    </div>
  )
}
