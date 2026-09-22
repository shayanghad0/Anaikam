import * as React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Spinner } from '@/components/ui/skeleton'

const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const ChatPage = React.lazy(() => import('@/pages/ChatPage'))
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'))

function FullscreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner className="h-7 w-7 text-primary" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { username, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullscreenSpinner />
  if (!username) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { username, loading } = useAuth()
  if (loading) return <FullscreenSpinner />
  if (username) return <Navigate to="/" replace />
  return <>{children}</>
}

function AuthedApp() {
  return (
    <RequireAuth>
      <ChatProvider>
        <React.Suspense fallback={<FullscreenSpinner />}>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/c/:chatId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </ChatProvider>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <TooltipProvider delayDuration={300}>
            <BrowserRouter>
              <React.Suspense fallback={<FullscreenSpinner />}>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <RedirectIfAuthed>
                        <LoginPage />
                      </RedirectIfAuthed>
                    }
                  />
                  <Route path="/*" element={<AuthedApp />} />
                </Routes>
              </React.Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
