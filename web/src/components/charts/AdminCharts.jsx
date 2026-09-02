import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { teacherLoad } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// Horizontal grouped bars per class: average % and attendance % side by side, sorted by average.
export function ClassOverviewBars({ perClass }) {
  const data = [...perClass].filter((c) => c.avg_pct != null || c.attendance_pct != null).sort((a, b) => (b.avg_pct ?? -1) - (a.avg_pct ?? -1))
  return (
    <ChartFrame
      title="Classes at a glance"
      subtitle="Average score and attendance per class, sorted by average"
      empty={data.length === 0}
      emptyHint="Appears once classes have marks or attendance."
      height={Math.max(160, 40 + data.length * 52)}
      legend={<><span><i style={{ background: CHART.accent }} />Average %</span><span><i style={{ background: CHART.series[1] }} />Attendance %</span></>}
    >
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={10} barGap={2}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Percent', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis type="category" dataKey="name" width={130} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} />
          <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const c = payload[0].payload
            return <ChartTip title={c.name} lines={[`Average ${c.avg_pct ?? '—'}%`, `Attendance ${c.attendance_pct ?? '—'}%`, { text: `${c.teacher_name} · ${c.enrolled} students`, muted: true }]} />
          }} />
          <Bar dataKey="avg_pct" fill={CHART.accent} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
          <Bar dataKey="attendance_pct" fill={CHART.series[1]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

// Classes and total students per teacher, computed from per_class.
export function TeacherLoadBar({ perClass }) {
  const data = teacherLoad(perClass)
  return (
    <ChartFrame
      title="Teacher load"
      subtitle="Classes taught and total students enrolled, per teacher"
      empty={data.length === 0}
      emptyHint="Appears once classes are assigned to teachers."
      height={Math.max(160, 40 + data.length * 52)}
      legend={<><span><i style={{ background: CHART.series[2] }} />Classes</span><span><i style={{ background: CHART.series[3] }} />Students</span></>}
    >
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={10} barGap={2}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Count', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis type="category" dataKey="teacher" width={130} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} />
          <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const t = payload[0].payload
            return <ChartTip title={t.teacher} lines={[`${t.classes} class${t.classes === 1 ? '' : 'es'}`, `${t.students} students in total`]} />
          }} />
          <Bar dataKey="classes" fill={CHART.series[2]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
          <Bar dataKey="students" fill={CHART.series[3]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
