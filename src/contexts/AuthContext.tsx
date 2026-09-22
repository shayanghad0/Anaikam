import * as React from 'react'
import { authApi } from '@/services/client'

interface AuthContextValue {
  username: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    try {
      const res = await authApi.session()
      setUsername(res.ok ? (res.username ?? 'admin') : null)
    } catch {
      setUsername(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const login = React.useCallback(async (user: string, password: string) => {
    const res = await authApi.login(user, password)
    if (!res.ok) throw new Error(res.error || 'Login failed')
    setUsername(res.username ?? user)
  }, [])

  const logout = React.useCallback(async () => {
    await authApi.logout()
    setUsername(null)
  }, [])

  const value = React.useMemo(
    () => ({ username, loading, login, logout, refresh }),
    [username, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
