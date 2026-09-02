import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { scoreDistribution } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// Score distribution for one assessment: five buckets of % of max, class mean marked.
export default function Histogram({ assessment, marks }) {
  const d = scoreDistribution(marks)
  return (
    <ChartFrame
      title={`Score distribution — ${assessment.title}`}
      subtitle={d.scored ? `${d.scored} scored · ${d.missing} missing · class mean ${d.mean}%` : `${d.missing} missing`}
      empty={d.scored === 0}
      emptyHint="No scores recorded for this assessment yet."
      height={240}
    >
      <ResponsiveContainer>
        <BarChart data={d.buckets} margin={{ top: 20, right: 24, bottom: 8, left: 8 }} barCategoryGap={12}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Score (% of max)', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis allowDecimals={false} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Students', angle: -90, position: 'insideLeft', ...axisStyle }} width={48} />
          <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const b = payload[0].payload
            return <ChartTip title={`${b.label}%`} lines={[`${b.count} student${b.count === 1 ? '' : 's'}`]} />
          }} />
          {d.meanBucket && (
            <ReferenceLine x={d.meanBucket} stroke={CHART.ink2} strokeDasharray="4 4" label={{ value: `mean ${d.mean}%`, position: 'top', fill: CHART.ink2, fontSize: 12 }} />
          )}
          <Bar dataKey="count" fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
