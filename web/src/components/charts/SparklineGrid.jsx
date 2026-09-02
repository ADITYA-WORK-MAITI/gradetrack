import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { EmptyState } from '../ui'
import { isAtRisk, marksSeries } from '../../lib/stats'
import { CHART } from './theme'

// One compact sparkline per student (marks over time, no axes), at-risk tinted red.
export default function SparklineGrid({ perf, marks }) {
  const rows = perf
    .filter((p) => p.is_active !== false)
    .map((p) => ({ ...p, risk: isAtRisk(p), points: marksSeries(marks.filter((m) => m.student_id === p.student_id)) }))
    .sort((a, b) => (b.average_pct ?? -1) - (a.average_pct ?? -1))

  if (rows.length === 0) return <EmptyState compact title="Not enough data yet" hint="Trends appear once students have marks." />

  return (
    <div className="spark-grid">
      {rows.map((r) => (
        <div key={r.student_id} className={`spark-row ${r.risk ? 'risk' : ''}`} title={`${r.name}: ${r.points.length} mark${r.points.length === 1 ? '' : 's'}`}>
          <span className="name">{r.name}</span>
          <div className="spark-box" aria-label={`${r.name} marks over time`}>
            {r.points.length < 2 ? <span className="muted small">{r.points.length === 0 ? 'no marks' : '1 mark'}</span> : (
              <ResponsiveContainer>
                <LineChart data={r.points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <YAxis domain={[0, 100]} hide />
                  <Line type="monotone" dataKey="pct" stroke={r.risk ? CHART.danger : CHART.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <span className="avg">{r.average_pct == null ? '—' : `${r.average_pct}%`}</span>
        </div>
      ))}
    </div>
  )
}
