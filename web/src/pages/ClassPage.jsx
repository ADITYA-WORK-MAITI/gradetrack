import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import Tabs from '../components/Tabs'
import { Banner, Loading } from '../components/ui'
import { classColor } from '../lib/classColor'
import StreamTab from './class/StreamTab'
import PerformanceTab from './class/PerformanceTab'
import MarksTab from './class/MarksTab'
import AttendanceTab from './class/AttendanceTab'
import RosterTab from './class/RosterTab'

const TABS = {
  teacher: ['stream', 'performance', 'marks', 'attendance', 'roster'],
  admin: ['stream', 'performance', 'marks', 'attendance', 'roster'],
  student: ['stream', 'performance', 'marks', 'attendance'],
}
const LABELS = { stream: 'Stream', performance: 'Performance', marks: 'Marks', attendance: 'Attendance', roster: 'Roster' }
const EMPTY = { roster: [], marks: [], attendance: [], perf: [], assessments: [], announcements: [] }

export default function ClassPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const role = user.role
  const [cls, setCls] = useState(null)
  const [data, setData] = useState(null)
  const [teacherName, setTeacherName] = useState(role === 'teacher' ? user.name : '')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('stream')

  const load = useCallback(() => {
    const canManage = role !== 'student'
    return Promise.all([
      canManage ? api(`/classes/${id}/enrollments`) : Promise.resolve([]),
      api(`/classes/${id}/marks`),
      api(`/classes/${id}/attendance`),
      api(`/classes/${id}/performance`),
      api(`/classes/${id}/assessments`),
      api(`/classes/${id}/announcements`),
    ])
      .then(([roster, marks, attendance, perf, assessments, announcements]) => { setData({ roster, marks, attendance, perf, assessments, announcements }); setError('') })
      .catch((e) => setError(e.message))
  }, [id, role])

  useEffect(() => {
    setCls(null); setData(null); setTab('stream')
    api(`/classes/${id}`)
      .then((c) => { setCls(c); return load() })
      .catch((e) => setError(e.message))
  }, [id, load])

  // Admin: resolve the teacher's name once the class is known.
  useEffect(() => {
    if (role !== 'admin' || !cls) return
    api(`/users/${cls.teacher_id}`).then((u) => setTeacherName(u.name)).catch(() => {})
  }, [role, cls])

  const color = classColor(id)

  if (error && !cls) {
    return (
      <div className="page">
        <Banner kind="error">{error}</Banner>
        <p style={{ marginTop: 16 }}><Link to="/">Back to your classes</Link></p>
      </div>
    )
  }
  if (!cls) return <div className="page"><Loading /></div>

  const tabs = TABS[role].map((t) => ({ id: t, label: LABELS[t] }))
  const common = { cls, role, reload: load, ...(data || EMPTY) }
  const activeCount = data ? data.roster.filter((e) => e.student_active !== false).length : null

  return (
    <div className="page">
      <div className="class-banner" style={{ background: color }}>
        <h1>{cls.name}</h1>
        <p>{cls.subject}{cls.academic_year ? ` · ${cls.academic_year}` : ''}{teacherName ? ` · ${teacherName}` : ''}{activeCount != null && role !== 'student' ? ` · ${activeCount} student${activeCount === 1 ? '' : 's'}` : ''}</p>
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <Banner kind="error">{error}</Banner>
      {!data ? <Loading /> : (
        <>
          {tab === 'stream' && <StreamTab {...common} />}
          {tab === 'performance' && <PerformanceTab {...common} />}
          {tab === 'marks' && <MarksTab {...common} />}
          {tab === 'attendance' && <AttendanceTab {...common} />}
          {tab === 'roster' && role !== 'student' && <RosterTab {...common} />}
        </>
      )}
    </div>
  )
}
