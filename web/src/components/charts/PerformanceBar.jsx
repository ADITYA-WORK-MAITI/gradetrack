import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { AT_RISK_AVG, isAtRisk } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// Horizontal bars of average % per student, sorted descending, 40% reference line.
export default function PerformanceBar({ rows }) {
  const data = rows
    .filter((r) => r.average_pct != null)
    .sort((a, b) => b.average_pct - a.average_pct)
    .map((r) => ({ ...r, risk: isAtRisk(r) }))

  return (
    <ChartFrame
      title="Average score by student"
      subtitle={`Sorted high to low · dashed line marks the ${AT_RISK_AVG}% at-risk threshold`}
      empty={data.length === 0}
      emptyHint="Averages appear once students have marks."
      height={Math.max(180, 40 + data.length * 36)}
      legend={<><span><i style={{ background: CHART.accent }} />Average %</span><span><i style={{ background: CHART.danger }} />At risk</span></>}
    >
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Average score (%)', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis type="category" dataKey="name" width={130} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} />
          <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return <ChartTip title={p.name} lines={[`Average ${p.average_pct}% across ${p.mark_count} mark${p.mark_count === 1 ? '' : 's'}`, { text: p.risk ? 'At risk' : `Attendance ${p.attendance_pct ?? '—'}%`, muted: !p.risk }]} />
          }} />
          <ReferenceLine x={AT_RISK_AVG} stroke={CHART.danger} strokeDasharray="4 4" />
          <Bar dataKey="average_pct" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.student_id} fill={d.risk ? CHART.danger : CHART.accent} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
