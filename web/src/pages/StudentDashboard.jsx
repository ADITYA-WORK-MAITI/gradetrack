import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, pct } from '../api'
import ClassCard from '../components/ClassCard'
import { Banner, Card, EmptyState, Loading } from '../components/ui'
import SubjectRadar from '../components/charts/SubjectRadar'
import { classColor } from '../lib/classColor'
import StudentSummary from './class/StudentSummary'

export default function StudentDashboard() {
  const [classes, setClasses] = useState(null)
  const [data, setData] = useState({}) // class id -> { marks, attendance, perf }
  const [error, setError] = useState('')

  useEffect(() => {
    api('/classes')
      .then(async (cs) => {
        setClasses(cs)
        const loaded = await Promise.all(cs.map((c) =>
          Promise.all([api(`/classes/${c.id}/marks`), api(`/classes/${c.id}/attendance`), api(`/classes/${c.id}/performance`)])
            .then(([marks, attendance, perf]) => ({ marks, attendance, perf: perf[0] || null }))
            .catch((e) => ({ error: e.message }))
        ))
        setData(Object.fromEntries(cs.map((c, i) => [c.id, loaded[i]])))
      })
      .catch((e) => { setError(e.message); setClasses([]) })
  }, [])

  const loadedAll = classes && classes.every((c) => data[c.id])
  const radarRows = loadedAll ? classes.map((c) => ({ name: c.name, avg: data[c.id]?.perf?.average_pct ?? null, attendance: data[c.id]?.perf?.attendance_pct ?? null })) : []

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Your classes</h1>
          <p>Averages, attendance and trends for every class you're enrolled in.</p>
        </div>
      </div>
      <Banner kind="error">{error}</Banner>
      {classes === null ? <Loading /> : classes.length === 0 ? (
        <EmptyState title="Not enrolled in any classes yet" hint="Your teacher or an admin will add you to a class." />
      ) : (
        <>
          <div className="class-grid section">
            {classes.map((c) => {
              const perf = data[c.id]?.perf
              return (
                <ClassCard
                  key={c.id}
                  cls={c}
                  stats={perf ? [{ label: 'average', value: pct(perf.average_pct) }, { label: 'attendance', value: pct(perf.attendance_pct) }] : undefined}
                />
              )
            })}
          </div>

          {loadedAll && (
            <div className="section">
              <Card>
                <SubjectRadar rows={radarRows} />
              </Card>
            </div>
          )}

          {classes.map((c) => {
            const d = data[c.id]
            return (
              <section key={c.id} className="section card">
                <div className="card-head">
                  <div className="row">
                    <span className="color-dot" style={{ background: classColor(c.id) }} />
                    <h3>{c.name}</h3>
                    <span className="muted">{c.subject}</span>
                  </div>
                  <Link to={`/classes/${c.id}`} className="btn btn-text btn-sm">Open class</Link>
                </div>
                <div className="card-body">
                  {!d ? <Loading /> : d.error ? <Banner kind="error">{d.error}</Banner> : (
                    <StudentSummary marks={d.marks} attendance={d.attendance} perf={d.perf} compact />
                  )}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
