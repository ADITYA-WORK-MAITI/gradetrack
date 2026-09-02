import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

// Bottom-left toast stack. toast(message) for success/info, toast(message, 'error') for failures.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const toast = useCallback((message, kind = 'success') => {
    const id = ++seq.current
    setToasts((ts) => [...ts, { id, message, kind }])
    setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'toast-error' : ''}`}>
            <span>{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)}>Dismiss</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
