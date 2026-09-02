import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { CATEGORIES, termAverages } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

const LABEL = { overall: 'Overall', assignment: 'Assignments', quiz: 'Quizzes', exam: 'Exams' }
const COLOR = { overall: CHART.accent, ...CHART.category }

// Grouped bars of average per term: overall plus each category present.
// `scope` is "class" (mean of per-student averages) or "personal".
export default function TermComparison({ marks, scope = 'class' }) {
  const rows = termAverages(marks)
  const series = ['overall', ...CATEGORIES.filter((c) => rows.some((r) => r[c] != null))]
  return (
    <ChartFrame
      title="Term comparison"
      subtitle={scope === 'class' ? 'Class average per term (each student averaged first)' : 'Your average per term'}
      empty={rows.length < 2}
      emptyHint="Needs 2+ terms to compare."
      height={240}
      legend={series.map((s) => <span key={s}><i style={{ background: COLOR[s] }} />{LABEL[s]}</span>)}
    >
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 12, right: 24, bottom: 8, left: 8 }} barCategoryGap={24} barGap={2}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="term" tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Term', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Average (%)', angle: -90, position: 'insideLeft', ...axisStyle }} width={56} />
          <Tooltip cursor={{ fill: 'rgba(60,64,67,.06)' }} content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return <ChartTip title={label} lines={payload.map((p) => `${LABEL[p.dataKey]}: ${p.value == null ? '—' : `${p.value}%`}`)} />
          }} />
          {series.map((s) => <Bar key={s} dataKey={s} fill={COLOR[s]} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
