import { CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { AT_RISK_ATTENDANCE, AT_RISK_AVG, isAtRisk } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// Attendance % (x) vs average % (y), one dot per student.
export default function PerformanceScatter({ rows }) {
  const data = rows
    .filter((r) => r.average_pct != null && r.attendance_pct != null)
    .map((r) => ({ ...r, risk: isAtRisk(r) }))

  return (
    <ChartFrame
      title="Attendance vs average"
      subtitle="Each dot is a student · hover for the name"
      empty={data.length === 0}
      emptyHint="Needs students with both marks and attendance."
      height={280}
      legend={<><span><i style={{ background: CHART.accent, borderRadius: '50%' }} />Student</span><span><i style={{ background: CHART.danger, borderRadius: '50%' }} />At risk</span></>}
    >
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={CHART.grid} />
          <XAxis type="number" dataKey="attendance_pct" domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Attendance (%)', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis type="number" dataKey="average_pct" domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Average (%)', angle: -90, position: 'insideLeft', ...axisStyle }} width={56} />
          <Tooltip cursor={{ stroke: CHART.grid }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return <ChartTip title={p.name} lines={[`Average ${p.average_pct}%`, `Attendance ${p.attendance_pct}%`, ...(p.risk ? ['At risk'] : [])]} />
          }} />
          <ReferenceLine y={AT_RISK_AVG} stroke={CHART.danger} strokeDasharray="4 4" />
          <ReferenceLine x={AT_RISK_ATTENDANCE} stroke={CHART.danger} strokeDasharray="4 4" />
          <Scatter data={data} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.student_id} fill={d.risk ? CHART.danger : CHART.accent} r={7} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
