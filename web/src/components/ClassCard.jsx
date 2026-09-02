import { Link } from 'react-router-dom'
import { classColor } from '../lib/classColor'

// Coloured class tile. `stats` is an optional list of {label, value} shown along the bottom.
export default function ClassCard({ cls, teacherName, studentCount, stats }) {
  return (
    <Link to={`/classes/${cls.id}`} className="class-card">
      <div className="class-card-band" style={{ background: classColor(cls.id) }}>
        <h3>{cls.name}</h3>
        <span className="subject">{cls.subject}</span>
      </div>
      <div className="class-card-body">
        {teacherName && <span className="meta">{teacherName}</span>}
        {cls.academic_year && <span className="meta">{cls.academic_year}</span>}
        {studentCount != null && (
          <span className="meta">{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
        )}
        {stats && stats.length > 0 && (
          <div className="class-card-stats">
            {stats.map((s) => (
              <div key={s.label}><strong>{s.value}</strong>{s.label}</div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
