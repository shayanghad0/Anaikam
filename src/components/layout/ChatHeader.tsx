import { Menu, PanelLeftClose, Sparkles, Download, RefreshCw, Square, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChat } from '@/contexts/ChatContext'
import { useSettings } from '@/contexts/SettingsContext'
import { cn } from '@/lib/utils'
import type { Chat } from '@shared/types'

export function ChatHeader({ onOpenExport }: { onOpenExport: (chat: Chat) => void }) {
  const { activeChat, setSidebarOpen, sidebarOpen, streaming, stopGeneration, regenerate } = useChat()
  const { config, selectedModel, setSelectedModel } = useSettings()

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
            {config.apiProviderName || 'Custom'} · {selectedModel || config.model}
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
        {config?.models && config.models.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Select model"
                title={`Model: ${selectedModel || config.model} — click to change`}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[100px] truncate">{selectedModel || config.model}</span>
                <svg className="h-3 w-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Model
              </p>
              {config.models.map((m) => (
                <DropdownMenuItem
                  key={m.name}
                  onClick={() => setSelectedModel(m.name)}
                  className={cn('gap-2 cursor-pointer', selectedModel === m.name && 'bg-muted')}
                >
                  <span className="font-mono text-xs">{m.name}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0',
                      m.type === 'vision' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                      m.type === 'text' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                      m.type === 'both' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    )}
                  >
                    {m.type === 'vision' ? 'Vision' : m.type === 'text' ? 'Text' : 'Both'}
                  </span>
                  {selectedModel === m.name ? <Check className="ml-auto h-3.5 w-3.5 text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  )
}
