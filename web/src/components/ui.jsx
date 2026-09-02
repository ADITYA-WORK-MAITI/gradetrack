// Small presentational building blocks shared across pages.

export function EmptyState({ title, hint, compact }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  )
}

export function Banner({ kind = 'info', children }) {
  if (!children) return null
  return <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

// Labelled form field. Pass `error` for inline validation text.
export function Field({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  )
}

export function Card({ title, subtitle, actions, children }) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  )
}

export function Stat({ label, value, sub, danger }) {
  return (
    <div className={`stat ${danger ? 'danger' : ''}`}>
      <div className="label">{label}</div>
      <div className="hero-num">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export const Loading = () => <p className="loading">Loading…</p>

export const AtRiskBadge = () => <span className="badge-risk">At risk</span>
