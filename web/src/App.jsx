import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider } from './components/Toast'
import AppBar from './components/AppBar'
import Login from './pages/Login'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ClassPage from './pages/ClassPage'

// Any signed-in user. A pending forced password change wins over everything else.
function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password) return <Navigate to="/account/password" replace />
  return children
}

// Route guard: unauthenticated -> /login, wrong role -> that role's dashboard.
function RequireRole({ role, children }) {
  const { user } = useAuth()
  if (user && user.role !== role) return <Navigate to={`/${user.role}`} replace />
  return <RequireAuth>{children}</RequireAuth>
}

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />
}

function Shell() {
  const { user } = useAuth()
  return (
    <>
      {user && <AppBar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account/password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />
          <Route path="/student" element={<RequireRole role="student"><StudentDashboard /></RequireRole>} />
          <Route path="/teacher" element={<RequireRole role="teacher"><TeacherDashboard /></RequireRole>} />
          <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/classes/:id" element={<RequireAuth><ClassPage /></RequireAuth>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
