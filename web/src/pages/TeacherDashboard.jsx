import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import ClassCard from '../components/ClassCard'
import { Banner, EmptyState, Loading } from '../components/ui'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [classes, setClasses] = useState(null)
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    api('/classes')
      .then(async (cs) => {
        setClasses(cs)
        const rosters = await Promise.all(cs.map((c) => api(`/classes/${c.id}/enrollments`).catch(() => [])))
        setCounts(Object.fromEntries(cs.map((c, i) => [c.id, rosters[i].filter((e) => e.student_active !== false).length])))
      })
      .catch((e) => { setError(e.message); setClasses([]) })
  }, [])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Your classes</h1>
          <p>Open a class to see performance, marks, attendance and the roster.</p>
        </div>
      </div>
      <Banner kind="error">{error}</Banner>
      {classes === null ? <Loading /> : classes.length === 0 ? (
        <EmptyState title="No classes assigned yet" hint="An admin assigns classes to teachers." />
      ) : (
        <div className="class-grid">
          {classes.map((c) => <ClassCard key={c.id} cls={c} teacherName={user.name} studentCount={counts[c.id]} />)}
        </div>
      )}
    </div>
  )
}
