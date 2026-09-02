// Client-side analytics helpers. All inputs are the raw shapes returned by the API.

export const AT_RISK_AVG = 40
export const AT_RISK_ATTENDANCE = 75

// A performance row is at risk when either metric falls under its threshold.
// Null percentages (no data yet) don't count as at risk.
export function isAtRisk(p) {
  return (p.average_pct != null && p.average_pct < AT_RISK_AVG) ||
    (p.attendance_pct != null && p.attendance_pct < AT_RISK_ATTENDANCE)
}

// Percentage for one mark; null when the score is missing.
export const markPct = (m) => (m.score == null || !(m.max_score > 0) ? null : (m.score / m.max_score) * 100)

// Class attendance % per session date, sorted by date.
export function attendanceByDate(records) {
  const byDate = new Map()
  for (const a of records) {
    const d = byDate.get(a.date) || { date: a.date, present: 0, total: 0 }
    d.total++
    if (a.status === 'present') d.present++
    byDate.set(a.date, d)
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, pct: d.total ? round1((d.present / d.total) * 100) : null }))
}

// One student's scored marks in chronological order as chart points (missing marks are skipped).
export function marksSeries(marks) {
  return marks
    .filter((m) => m.score != null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
    .map((m) => ({ id: m.id, title: m.title, date: m.created_at.slice(0, 10), pct: round1(markPct(m)), score: m.score, max_score: m.max_score }))
}

// Consecutive "present" sessions counting back from the most recent one.
export function currentStreak(records) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  let n = 0
  for (const r of sorted) {
    if (r.status !== 'present') break
    n++
  }
  return n
}

export const round1 = (v) => Math.round(v * 10) / 10

export function mean(values) {
  const xs = values.filter((v) => v != null && !Number.isNaN(v))
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

export const fmtDate = (iso) => {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// "3 minutes ago", "yesterday", "2 weeks ago" — for stream timestamps.
export function relativeTime(iso, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.round(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 14) return `${day} days ago`
  const wk = Math.round(day / 7)
  if (wk < 9) return `${wk} weeks ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}

// Monthly register: rows = students, columns = the session dates in `month` (YYYY-MM).
export function monthlyRegister(records, roster, month) {
  const dates = [...new Set(records.filter((r) => r.date.startsWith(month)).map((r) => r.date))].sort()
  const byKey = new Map(records.map((r) => [`${r.student_id}|${r.date}`, r.status]))
  const rows = roster.map((s) => {
    const cells = dates.map((d) => byKey.get(`${s.student_id}|${d}`) ?? null)
    const present = cells.filter((c) => c === 'present').length
    const recorded = cells.filter((c) => c != null).length
    return { student_id: s.student_id, name: s.student_name, active: s.student_active !== false, cells, present, recorded }
  })
  const totals = dates.map((d, i) => {
    const col = rows.map((r) => r.cells[i]).filter((c) => c != null)
    return { date: d, present: col.filter((c) => c === 'present').length, total: col.length }
  })
  return { dates, rows, totals }
}

// Months (YYYY-MM) that have any attendance, newest first.
export const attendanceMonths = (records) => [...new Set(records.map((r) => r.date.slice(0, 7)))].sort().reverse()

export const CATEGORIES = ['assignment', 'quiz', 'exam']

// Mean of per-student mark percentages: each student's marks are averaged
// first, then the students are averaged — the same semantics as /performance.
function meanOfStudentMeans(marks) {
  const byStudent = new Map()
  for (const m of marks) {
    const p = markPct(m)
    if (p == null) continue
    const s = byStudent.get(m.student_id) || []
    s.push(p)
    byStudent.set(m.student_id, s)
  }
  const means = [...byStudent.values()].map((xs) => mean(xs))
  return means.length ? round1(mean(means)) : null
}

// Per-term averages (overall + per category). Works for one student's marks
// (personal) or a whole class's marks (class-wide).
export function termAverages(marks) {
  const scored = marks.filter((m) => m.score != null)
  const terms = [...new Set(scored.map((m) => m.term))].sort()
  return terms.map((term) => {
    const tm = scored.filter((m) => m.term === term)
    const row = { term, overall: meanOfStudentMeans(tm), count: tm.length }
    for (const c of CATEGORIES) {
      const cm = tm.filter((m) => m.category === c)
      row[c] = cm.length ? meanOfStudentMeans(cm) : null
    }
    return row
  })
}

// Change from the previous term to the latest one, or null with < 2 terms.
export function termDelta(rows) {
  const withData = rows.filter((r) => r.overall != null)
  if (withData.length < 2) return null
  const latest = withData[withData.length - 1], previous = withData[withData.length - 2]
  return { latest: latest.term, previous: previous.term, delta: round1(latest.overall - previous.overall) }
}

export const SCORE_BUCKETS = [
  { label: '0–39', min: 0, max: 39.999 },
  { label: '40–59', min: 40, max: 59.999 },
  { label: '60–74', min: 60, max: 74.999 },
  { label: '75–89', min: 75, max: 89.999 },
  { label: '90–100', min: 90, max: 100 },
]

// Bucketed distribution of one assessment's scores (as % of max).
export function scoreDistribution(marks) {
  const pcts = marks.map(markPct).filter((p) => p != null)
  const buckets = SCORE_BUCKETS.map((b) => ({ ...b, count: pcts.filter((p) => p >= b.min && p <= b.max).length }))
  const avg = pcts.length ? round1(mean(pcts)) : null
  const meanBucket = avg == null ? null : buckets.find((b) => avg >= b.min && avg <= b.max)?.label ?? null
  return { buckets, mean: avg, meanBucket, scored: pcts.length, missing: marks.length - pcts.length }
}

// Teacher load from the admin overview's per_class rows.
export function teacherLoad(perClass) {
  const byTeacher = new Map()
  for (const c of perClass) {
    const t = byTeacher.get(c.teacher_name) || { teacher: c.teacher_name, classes: 0, students: 0 }
    t.classes++
    t.students += c.enrolled
    byTeacher.set(c.teacher_name, t)
  }
  return [...byTeacher.values()].sort((a, b) => b.students - a.students || a.teacher.localeCompare(b.teacher))
}
