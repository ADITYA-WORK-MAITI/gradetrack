// Single fetch wrapper: attaches the JWT, parses JSON, throws on errors,
// and bounces to /login when a protected call comes back 401.
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api' + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('session expired')
  }
  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`)
  return data
}

// Format a nullable percentage from the API for display.
export const pct = (v) => (v == null ? '—' : `${v}%`)
