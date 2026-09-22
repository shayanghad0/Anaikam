import { Menu, PanelLeftClose, Sparkles, Download, RefreshCw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/contexts/ChatContext'
import { useSettings } from '@/contexts/SettingsContext'
import { cn } from '@/lib/utils'
import type { Chat } from '@shared/types'

export function ChatHeader({ onOpenExport }: { onOpenExport: (chat: Chat) => void }) {
  const { activeChat, setSidebarOpen, sidebarOpen, streaming, stopGeneration, regenerate } = useChat()
  const { config } = useSettings()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl sm:px-4">
      <button
        type="button"
        className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        className="hidden cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:block"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <PanelLeftClose className={cn('h-4.5 w-4.5 transition-transform', sidebarOpen && 'rotate-0')} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold">
          {activeChat?.title ?? 'New chat'}
        </h1>
        {config?.model ? (
          <p className="truncate text-[11px] text-muted-foreground">
            {config.apiProviderName || 'Custom'} · {config.model}
          </p>
        ) : (
          <p className="truncate text-[11px] text-muted-foreground">Not configured</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {streaming ? (
          <Button size="sm" variant="secondary" onClick={stopGeneration}>
            <Square className="h-3.5 w-3.5 fill-current" />
            Stop
          </Button>
        ) : activeChat && activeChat.messages.length > 0 ? (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => void regenerate()}
              aria-label="Regenerate last response"
              title="Regenerate"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => activeChat && onOpenExport(activeChat)}
              aria-label="Export chat"
              title="Export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        ) : null}
        {config?.model ? (
          <div className="ml-1 hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:flex">
            <Sparkles className="h-3 w-3" />
            {config.model}
          </div>
        ) : null}
      </div>
    </header>
  )
}
