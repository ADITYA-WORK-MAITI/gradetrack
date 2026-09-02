import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// Average per class for one student. A radar needs at least three axes to
// read as a shape, so with fewer classes this renders grouped bars instead.
export default function SubjectRadar({ rows }) {
  const data = rows.filter((r) => r.avg != null || r.attendance != null)
  const useRadar = data.filter((r) => r.avg != null).length >= 3
  const legend = <><span><i style={{ background: CHART.accent }} />Average %</span>{!useRadar && <span><i style={{ background: CHART.series[1] }} />Attendance %</span>}</>
  return (
    <ChartFrame
      title="Across your classes"
      subtitle={useRadar ? 'Average score per class' : 'Average score and attendance per class'}
      empty={data.length === 0}
      emptyHint="Appears once you have marks or attendance in a class."
      height={260}
      legend={legend}
    >
      <ResponsiveContainer>
        {useRadar ? (
          <RadarChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
            <PolarGrid stroke={CHART.grid} />
            <PolarAngleAxis dataKey="name" tick={axisStyle} />
            <PolarRadiusAxis domain={[0, 100]} tick={axisStyle} axisLine={false} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return <ChartTip title={p.name} lines={[`Average ${p.avg}%`, { text: `Attendance ${p.attendance ?? '—'}%`, muted: true }]} />
            }} />
            <Radar dataKey="avg" stroke={CHART.accent} fill={CHART.accent} fillOpacity={0.15} strokeWidth={2} dot={{ r: 4, fill: CHART.accent, strokeWidth: 0 }} isAnimationActive={false} />
          </RadarChart>
        ) : (
          <BarChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }} barCategoryGap={28} barGap={2}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="name" tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Class', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
            <YAxis domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Percent', angle: -90, position: 'insideLeft', ...axisStyle }} width={56} />
            <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return <ChartTip title={p.name} lines={[`Average ${p.avg ?? '—'}%`, `Attendance ${p.attendance ?? '—'}%`]} />
            }} />
            <Bar dataKey="avg" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
            <Bar dataKey="attendance" fill={CHART.series[1]} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </ChartFrame>
  )
}
