import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { Card, EmptyState, Field } from '../../components/ui'
import Histogram from '../../components/charts/Histogram'
import { downloadCsv } from '../../lib/csv'
import { markPct, round1 } from '../../lib/stats'

export const CATEGORIES = ['assignment', 'quiz', 'exam']

export default function MarksTab({ cls, role, roster, marks, assessments, reload }) {
  const toast = useToast()
  const rosterById = useMemo(() => new Map(roster.map((e) => [e.student_id, e])), [roster])
  const nameOf = (id) => {
    const e = rosterById.get(id)
    return e ? (e.student_active === false ? `${e.student_name} (inactive)` : e.student_name) : `#${id}`
  }
  const run = (promise, okMessage) =>
    promise.then(reload).then(() => { toast(okMessage); return true }).catch((e) => { toast(e.message, 'error'); return false })

  const isTeacher = role === 'teacher'
  const [term, setTerm] = useState('all')
  const [category, setCategory] = useState('all')
  const terms = useMemo(() => [...new Set(assessments.map((a) => a.term))].sort(), [assessments])

  const shown = marks
    .filter((m) => (term === 'all' || m.term === term) && (category === 'all' || m.category === category))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)

  const exportCsv = () => {
    const header = [...(role !== 'student' ? ['Student'] : []), 'Assessment', 'Category', 'Term', 'Score', 'Max', 'Percent', 'Recorded']
    const rows = shown.map((m) => [
      ...(role !== 'student' ? [nameOf(m.student_id)] : []),
      m.title, m.category, m.term, m.score ?? 'missing', m.max_score, m.score == null ? '' : round1(markPct(m)), m.created_at.slice(0, 10),
    ])
    downloadCsv(`${cls.name} marks${term !== 'all' ? ` ${term}` : ''}${category !== 'all' ? ` ${category}` : ''}`, [header, ...rows])
  }

  return (
    <div className="stack">
      {isTeacher && <BulkEntry cls={cls} roster={roster} assessments={assessments} marks={marks} run={run} />}
      {role !== 'student' && <Distribution assessments={assessments} marks={marks} roster={roster} />}
      <Card
        title={role === 'student' ? 'Your marks' : 'All marks'}
        subtitle={`${shown.length} shown · ${shown.filter((m) => m.score == null).length} missing`}
        actions={
          <div className="filters">
            <Field id="mf-term" label="Term">
              <select id="mf-term" className="input" value={term} onChange={(e) => setTerm(e.target.value)}>
                <option value="all">All terms</option>
                {terms.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field id="mf-cat" label="Category">
              <select id="mf-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            {role !== 'student' && <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={shown.length === 0}>Export CSV</button>}
          </div>
        }
      >
        {shown.length === 0 ? (
          <EmptyState compact title={marks.length === 0 ? 'No marks yet' : 'No marks match these filters'} hint={marks.length === 0 ? (isTeacher ? 'Enter scores above.' : 'Marks will appear here once your teacher records them.') : ''} />
        ) : (
          <MarksTable rows={shown} role={role} nameOf={nameOf} run={run} />
        )}
      </Card>
    </div>
  )
}

// Pick an assessment → bucketed score distribution for the active roster.
function Distribution({ assessments, marks, roster }) {
  const latest = assessments.length ? assessments[assessments.length - 1].id : ''
  const [id, setId] = useState(String(latest))
  useEffect(() => { if (!assessments.some((a) => String(a.id) === id)) setId(String(latest)) }, [assessments, latest]) // eslint-disable-line react-hooks/exhaustive-deps
  const a = assessments.find((x) => String(x.id) === id)
  const activeIds = new Set(roster.filter((e) => e.student_active !== false).map((e) => e.student_id))
  const rows = a ? marks.filter((m) => m.assessment_id === a.id && activeIds.has(m.student_id)) : []
  return (
    <Card
      title="Score distribution"
      subtitle="How the class did on one assessment (active students)"
      actions={
        <Field id="dist-pick" label="Assessment">
          <select id="dist-pick" className="input input-sm" value={id} onChange={(e) => setId(e.target.value)} disabled={assessments.length === 0}>
            {assessments.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.term}</option>)}
          </select>
        </Field>
      }
    >
      {!a ? <EmptyState compact title="No assessments yet" hint="Create one in the score entry form above." /> : <Histogram assessment={a} marks={rows} />}
    </Card>
  )
}

// Whole-roster score entry for one assessment (pick existing or create inline).
function BulkEntry({ cls, roster, assessments, marks, run }) {
  const [assessmentId, setAssessmentId] = useState('')
  const [creating, setCreating] = useState(assessments.length === 0)
  const [draft, setDraft] = useState({ title: '', category: 'assignment', term: 'Term 1', max_score: '' })
  const [scores, setScores] = useState({}) // student_id -> string
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)

  const setD = (k) => (e) => setDraft({ ...draft, [k]: e.target.value })
  const selected = assessments.find((a) => a.id === Number(assessmentId))
  const maxScore = creating ? Number(draft.max_score) : selected?.max_score
  const active = roster.filter((e) => e.student_active !== false)
  const listed = active.filter((e) => e.student_name.toLowerCase().includes(filter.trim().toLowerCase()))

  // Prefill from existing marks whenever the picked assessment changes.
  useEffect(() => {
    if (!selected) return setScores({})
    const existing = Object.fromEntries(marks.filter((m) => m.assessment_id === selected.id).map((m) => [m.student_id, m.score == null ? '' : String(m.score)]))
    setScores(existing)
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const errors = Object.fromEntries(active.map((e) => {
    const v = scores[e.student_id]
    if (v == null || v === '') return [e.student_id, '']
    const n = Number(v)
    return [e.student_id, Number.isNaN(n) ? 'Not a number' : n < 0 ? 'Negative' : maxScore > 0 && n > maxScore ? `> ${maxScore}` : '']
  }))
  const hasErrors = Object.values(errors).some(Boolean)
  const maxError = creating && draft.max_score !== '' && Number(draft.max_score) <= 0 ? 'Maximum must be greater than 0' : ''
  const assessmentReady = creating ? draft.title && draft.term && draft.max_score !== '' && !maxError : !!selected
  const filled = active.filter((e) => scores[e.student_id] != null && scores[e.student_id] !== '').length

  const submit = async (e) => {
    e.preventDefault()
    if (!assessmentReady || hasErrors || active.length === 0) return
    setBusy(true)
    try {
      let aid = selected?.id
      if (creating) {
        const a = await api(`/classes/${cls.id}/assessments`, { method: 'POST', body: { ...draft, max_score: Number(draft.max_score) } })
        aid = a.id
      }
      const entries = active.map((s) => ({ student_id: s.student_id, score: scores[s.student_id] == null || scores[s.student_id] === '' ? null : Number(scores[s.student_id]) }))
      const ok = await run(api(`/assessments/${aid}/scores`, { method: 'POST', body: entries }), `Saved ${filled} score${filled === 1 ? '' : 's'} (${active.length - filled} missing)`)
      if (ok && creating) { setCreating(false); setAssessmentId(String(aid)) }
    } catch (err) {
      run(Promise.reject(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Enter scores" subtitle="Pick an assessment, fill in the roster and save once. Blank = missing / not submitted.">
      {active.length === 0 ? <EmptyState compact title="No active students enrolled" hint="Enrol students before entering scores." /> : (
        <form className="form-stack" onSubmit={submit} noValidate>
          <div className="form-row">
            {!creating ? (
              <Field id="as-pick" label="Assessment">
                <select id="as-pick" className="input" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} required>
                  <option value="">Choose…</option>
                  {assessments.map((a) => <option key={a.id} value={a.id}>{a.title} · {a.category} · {a.term} · /{a.max_score}</option>)}
                </select>
              </Field>
            ) : (
              <>
                <Field id="as-title" label="New assessment title">
                  <input id="as-title" className="input" placeholder="e.g. Quiz 3" value={draft.title} onChange={setD('title')} required />
                </Field>
                <Field id="as-cat" label="Category">
                  <select id="as-cat" className="input" value={draft.category} onChange={setD('category')}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field id="as-term" label="Term">
                  <input id="as-term" className="input" style={{ width: 120 }} value={draft.term} onChange={setD('term')} required />
                </Field>
                <Field id="as-max" label="Out of" error={maxError}>
                  <input id="as-max" className="input" type="number" min="0.5" step="0.5" style={{ width: 110 }} value={draft.max_score} onChange={setD('max_score')} aria-invalid={!!maxError} required />
                </Field>
              </>
            )}
            {(assessments.length > 0 || !creating) && (
              <button type="button" className="btn btn-text" onClick={() => { setCreating((v) => !v); setAssessmentId(''); setScores({}) }}>
                {creating ? 'Pick existing instead' : '+ New assessment'}
              </button>
            )}
          </div>

          {assessmentReady && (
            <>
              <div className="filters">
                <Field id="bulk-filter" label="Find student">
                  <input id="bulk-filter" className="input" placeholder="Type a name" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 220 }} />
                </Field>
                <span className="muted small">{filled} of {active.length} scored · out of {maxScore}</span>
              </div>
              <div className="bulk-grid">
                {listed.map((s) => (
                  <div key={s.student_id} className="bulk-row">
                    <label htmlFor={`sc-${s.student_id}`}>{s.student_name}</label>
                    <span>
                      <input
                        id={`sc-${s.student_id}`}
                        className="input input-sm"
                        type="number" min="0" step="0.5" placeholder="—"
                        value={scores[s.student_id] ?? ''}
                        onChange={(e) => setScores({ ...scores, [s.student_id]: e.target.value })}
                        aria-invalid={!!errors[s.student_id]}
                        aria-label={`Score for ${s.student_name}`}
                      />
                      {errors[s.student_id] && <span className="field-error" style={{ marginLeft: 6 }}>{errors[s.student_id]}</span>}
                    </span>
                  </div>
                ))}
                {listed.length === 0 && <span className="muted">No students match "{filter}"</span>}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy || hasErrors}>{busy ? 'Saving…' : `Save all ${active.length} scores`}</button>
                {hasErrors && <span className="field-error">Fix the highlighted scores first — nothing is saved until every score is valid.</span>}
              </div>
            </>
          )}
        </form>
      )}
    </Card>
  )
}

function MarksTable({ rows, role, nameOf, run }) {
  const [editing, setEditing] = useState(null) // { id, score, max_score }
  const [confirmId, setConfirmId] = useState(null)
  const isTeacher = role === 'teacher'
  const editNum = editing && editing.score !== '' ? Number(editing.score) : null
  const editError = editing && editNum != null && (editNum > editing.max_score || editNum < 0) ? `Must be 0–${editing.max_score}` : ''

  const save = () => {
    if (editError) return
    run(api(`/marks/${editing.id}`, { method: 'PUT', body: { score: editNum } }), editNum == null ? 'Marked as missing' : 'Score updated')
      .then((ok) => ok && setEditing(null))
  }
  const remove = (id) => run(api(`/marks/${id}`, { method: 'DELETE' }), 'Mark deleted').then(() => setConfirmId(null))

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {role !== 'student' && <th>Student</th>}
            <th>Assessment</th>
            <th>Category</th>
            <th>Term</th>
            <th className="num">Score</th>
            <th className="num">%</th>
            <th>Recorded</th>
            {isTeacher && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => editing?.id === m.id ? (
            <tr key={m.id} className="editing">
              <td>{nameOf(m.student_id)}</td>
              <td>{m.title}</td>
              <td><span className="chip chip-neutral">{m.category}</span></td>
              <td>{m.term}</td>
              <td className="num">
                <input className="input input-sm cell-input" type="number" min="0" step="0.5" aria-label="Score" placeholder="missing" value={editing.score} onChange={(e) => setEditing({ ...editing, score: e.target.value })} aria-invalid={!!editError} />
                {' / '}{m.max_score}
                {editError && <div className="field-error">{editError}</div>}
              </td>
              <td className="num muted">{editNum == null ? '—' : `${round1((editNum / m.max_score) * 100)}%`}</td>
              <td className="muted">{m.created_at.slice(0, 10)}</td>
              <td className="actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!!editError}>Save</button>{' '}
                <button type="button" className="btn btn-text btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              </td>
            </tr>
          ) : (
            <tr key={m.id}>
              {role !== 'student' && <td>{nameOf(m.student_id)}</td>}
              <td>{m.title}</td>
              <td><span className="chip chip-neutral">{m.category}</span></td>
              <td>{m.term}</td>
              <td className="num">{m.score == null ? <span className="chip chip-danger">missing</span> : `${m.score} / ${m.max_score}`}</td>
              <td className="num">{m.score == null ? '—' : `${round1(markPct(m))}%`}</td>
              <td className="muted">{m.created_at.slice(0, 10)}</td>
              {isTeacher && (
                <td className="actions">
                  {confirmId === m.id ? (
                    <>
                      <span className="muted small">Delete this mark? </span>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(m.id)}>Delete</button>{' '}
                      <button type="button" className="btn btn-text btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => { setConfirmId(null); setEditing({ id: m.id, score: m.score == null ? '' : m.score, max_score: m.max_score }) }}>Edit</button>
                      <button type="button" className="btn btn-text btn-sm danger" onClick={() => setConfirmId(m.id)}>Delete</button>
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
