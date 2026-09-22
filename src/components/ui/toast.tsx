import * as React from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/skeleton'

interface Toast {
  id: number
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const idRef = React.useRef(0)

  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 4000)
  }, [])

  const value = React.useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-xl border p-4 shadow-soft animate-fade-up glass-panel',
              t.variant === 'destructive' && 'border-destructive/40',
              t.variant === 'success' && 'border-primary/40',
            )}
            role="status"
          >
            <div className="flex items-start gap-2">
              {t.variant === 'default' ? <Spinner className="mt-0.5 text-primary" /> : null}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground break-words">{t.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
