import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { attendanceByDate, fmtDate } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// Class attendance % per session date.
export default function AttendanceLine({ records }) {
  const data = attendanceByDate(records).map((d) => ({ ...d, label: fmtDate(d.date) }))
  return (
    <ChartFrame
      title="Class attendance by session"
      subtitle="Share of the class marked present on each recorded date"
      empty={data.length === 0}
      emptyHint="Record attendance for a session to see the trend."
      height={240}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Session date', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Present (%)', angle: -90, position: 'insideLeft', ...axisStyle }} width={56} />
          <Tooltip cursor={{ stroke: CHART.grid }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return <ChartTip title={p.date} lines={[`${p.pct}% present`, { text: `${p.present} of ${p.total} students`, muted: true }]} />
          }} />
          <Line type="monotone" dataKey="pct" stroke={CHART.accent} strokeWidth={2} dot={{ r: 4, fill: CHART.accent, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
