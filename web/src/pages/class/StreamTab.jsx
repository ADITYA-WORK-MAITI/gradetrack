import { useState } from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { Card, EmptyState } from '../../components/ui'
import { relativeTime } from '../../lib/stats'

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

// Class announcements, newest first. The owning teacher can post and delete.
export default function StreamTab({ cls, role, announcements, reload }) {
  const toast = useToast()
  const isTeacher = role === 'teacher'
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const post = (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    api(`/classes/${cls.id}/announcements`, { method: 'POST', body: { body: body.trim() } })
      .then(reload).then(() => { setBody(''); toast('Announcement posted') })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setBusy(false))
  }
  const remove = (id) =>
    api(`/announcements/${id}`, { method: 'DELETE' }).then(reload).then(() => { setConfirmId(null); toast('Announcement deleted') }).catch((err) => toast(err.message, 'error'))

  return (
    <div className="stack">
      {isTeacher && (
        <Card title="Announce something to your class">
          <form className="compose form-stack" onSubmit={post}>
            <label htmlFor="ann-body" className="muted small">Message (up to 2000 characters)</label>
            <textarea id="ann-body" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Share a reminder, results, or what's coming up…" />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={!body.trim() || busy}>{busy ? 'Posting…' : 'Post'}</button>
              <span className="muted small">{body.length} / 2000</span>
            </div>
          </form>
        </Card>
      )}
      <Card title="Stream" subtitle={`${announcements.length} announcement${announcements.length === 1 ? '' : 's'}`}>
        {announcements.length === 0 ? (
          <EmptyState compact title="Nothing posted yet" hint={isTeacher ? 'Your first announcement will show up here.' : 'Announcements from your teacher will appear here.'} />
        ) : announcements.map((a) => (
          <article key={a.id} className="post">
            <span className="avatar" aria-hidden="true">{initials(a.teacher_name)}</span>
            <div className="post-body">
              <div className="post-meta">
                <strong>{a.teacher_name}</strong>
                <time dateTime={a.created_at} title={new Date(a.created_at).toLocaleString()}>{relativeTime(a.created_at)}</time>
              </div>
              <p className="post-text">{a.body}</p>
            </div>
            {isTeacher && (
              confirmId === a.id ? (
                <span className="row">
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>Delete</button>
                  <button type="button" className="btn btn-text btn-sm" onClick={() => setConfirmId(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="btn btn-text btn-sm danger" onClick={() => setConfirmId(a.id)}>Delete</button>
              )
            )}
          </article>
        ))}
      </Card>
    </div>
  )
}
