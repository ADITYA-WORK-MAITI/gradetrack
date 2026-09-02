import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartFrame, { ChartTip } from './ChartFrame'
import { fmtDate, marksSeries } from '../../lib/stats'
import { CHART, axisLine, axisStyle, tickLine } from './theme'

// One student's mark percentages over time (by created_at). `average` draws a faint
// horizontal line at the student's overall average from the performance endpoint.
export default function MarksLine({ marks, average }) {
  const data = marksSeries(marks).map((m) => ({ ...m, label: fmtDate(m.date) }))
  return (
    <ChartFrame
      title="Marks over time"
      subtitle="Each point is one mark as a % of its maximum"
      empty={data.length === 0}
      emptyHint="Marks will chart here once they're recorded."
      height={240}
      legend={<><span><i className="line" style={{ background: CHART.accent }} />Mark %</span>{average != null && <span><i className="line" style={{ background: CHART.ink3 }} />Your average ({average}%)</span>}</>}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={axisLine} tickLine={tickLine} label={{ value: 'Date recorded', position: 'insideBottom', offset: -2, ...axisStyle }} height={40} />
          <YAxis domain={[0, 100]} tick={axisStyle} axisLine={axisLine} tickLine={tickLine} unit="%" label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', ...axisStyle }} width={56} />
          <Tooltip cursor={{ stroke: CHART.grid }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return <ChartTip title={p.title} lines={[`${p.score} / ${p.max_score} (${p.pct}%)`, { text: p.date, muted: true }]} />
          }} />
          {average != null && <ReferenceLine y={average} stroke={CHART.ink3} strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="pct" stroke={CHART.accent} strokeWidth={2} dot={{ r: 4, fill: CHART.accent, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
