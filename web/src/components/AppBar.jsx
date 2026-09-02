import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export function BrandMark({ size }) {
  return <span className="brand-mark" style={size ? { width: size, height: size } : undefined} aria-hidden="true">G</span>
}

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function AppBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <header className="appbar">
      <Link to="/" className="brand"><BrandMark />GradeTrack</Link>
      {user && (
        <div className="appbar-right">
          <span className="chip">{user.role}</span>
          <div className="menu-wrap" ref={wrap}>
            <button type="button" className="menu-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
              <span className="appbar-name">{user.name}</span>
            </button>
            {open && (
              <div className="menu" role="menu">
                <div className="menu-head"><strong>{user.name}</strong><span>Signed in as {user.role}</span></div>
                <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); navigate('/account/password') }}>Change password</button>
                <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); logout() }}>Log out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
