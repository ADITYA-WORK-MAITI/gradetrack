import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { CATEGORIES } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

const LABEL = { assignment: 'Assignments', quiz: 'Quizzes', exam: 'Exams' }

// A student's average per assessment category, from the performance row's
// `categories` breakdown. The API only returns the student's own row, so
// there is no class comparison here (noted in the subtitle).
export default function CategoryBars({ categories }) {
  const data = CATEGORIES
    .map((c) => categories.find((x) => x.category === c))
    .filter((x) => x && x.average_pct != null)
    .map((x) => ({ ...x, label: LABEL[x.category] }))
  return (
    <ChartFrame
      title="Your average by category"
      subtitle="Personal averages — class-wide category averages aren't exposed to students"
      empty={data.length === 0}
      emptyHint="Category averages appear once you have scored marks."
      height={220}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }} barCategoryGap={28}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Category', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Average (%)', angle: -90, position: 'insideLeft', ...axisStyle }} width={56} />
          <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return <ChartTip title={p.label} lines={[`${p.average_pct}% across ${p.mark_count} mark${p.mark_count === 1 ? '' : 's'}`]} />
          }} />
          <Bar dataKey="average_pct" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.category} fill={CHART.category[d.category]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
