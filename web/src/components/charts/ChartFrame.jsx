import { EmptyState } from '../ui'

// Title + optional subtitle above a fixed-height chart area, with a shared empty state.
export default function ChartFrame({ title, subtitle, empty, emptyHint, height = 260, legend, children }) {
  return (
    <div className="chart-frame">
      <div>
        <div className="chart-title">{title}</div>
        {subtitle && <div className="chart-sub">{subtitle}</div>}
      </div>
      {empty ? (
        <EmptyState compact title="Not enough data yet" hint={emptyHint} />
      ) : (
        <>
          <div className="chart-box" style={{ height }}>{children}</div>
          {legend && <div className="legend">{legend}</div>}
        </>
      )}
    </div>
  )
}

export function ChartTip({ title, lines }) {
  return (
    <div className="chart-tip">
      {title && <strong>{title}</strong>}
      {lines.map((l, i) => <div key={i} className={l.muted ? 'muted' : ''}>{l.text ?? l}</div>)}
    </div>
  )
}
