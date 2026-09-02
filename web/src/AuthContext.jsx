import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }))

  const login = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setAuth({ token, user })
  }

  // Patch the cached user (e.g. clearing must_change_password after a change).
  const updateUser = (patch) => {
    setAuth((a) => {
      const user = { ...a.user, ...patch }
      localStorage.setItem('user', JSON.stringify(user))
      return { ...a, user }
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuth({ token: null, user: null })
  }

  return <AuthContext.Provider value={{ ...auth, login, logout, updateUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
