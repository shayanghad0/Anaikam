import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar onNavigateSettings={() => navigate('/settings')} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
