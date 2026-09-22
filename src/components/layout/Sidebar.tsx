import * as React from 'react'
import {
  Plus,
  Search,
  Settings,
  LogOut,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { groupChatsByDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ExportDialog } from '@/components/chat/MessageItem'
import type { Chat, Message } from '@shared/types'

export function Sidebar({ onNavigateSettings }: { onNavigateSettings: () => void }) {
  const {
    chats,
    activeChat,
    loadingList,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
    importChat,
    sidebarOpen,
    setSidebarOpen,
  } = useChat()
  const { logout, username } = useAuth()
  const { toast } = useToast()
  const fileRef = React.useRef<HTMLInputElement>(null)

  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title: string } | null>(null)
  const [renameValue, setRenameValue] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null)
  const [exportChat, setExportChat] = React.useState<Chat | null>(null)

  const grouped = React.useMemo(() => groupChatsByDate(chats), [chats])

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Partial<Chat> & { messages: Message[] }
      if (!Array.isArray(data.messages)) throw new Error('Invalid format')
      const chat = await importChat(data)
      toast({ title: 'Imported', description: chat.title, variant: 'success' })
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Invalid JSON file',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Chat history"
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Anaikam ChatBot</p>
              <p className="truncate text-[11px] text-muted-foreground">{username}</p>
            </div>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2 space-y-2">
          <Button className="w-full justify-start gap-2" onClick={() => void newChat()}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats…"
              className="h-8 pl-8 pr-8 text-sm"
              aria-label="Search chats"
            />
            {searchQuery ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          {loadingList ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : searchQuery.trim() ? (
            searching ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="p-1">
                <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Results
                </p>
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => void selectChat(r.id)}
                    className={cn(
                      'w-full cursor-pointer rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted',
                      activeChat?.id === r.id && 'bg-muted',
                    )}
                  >
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.matches[0]?.snippet}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No chats match “{searchQuery}”</p>
            )
          ) : grouped.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No conversations yet</p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-2">
                <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      'group relative flex items-center gap-1 rounded-lg transition-colors',
                      activeChat?.id === chat.id ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void selectChat(chat.id)}
                      className="min-w-0 flex-1 cursor-pointer truncate rounded-lg px-2.5 py-2 text-left text-sm"
                      title={chat.title}
                    >
                      <span className="block truncate">{chat.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {formatDateTime(chat.updatedAt)}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="mr-1 cursor-pointer rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-background data-[state=open]:opacity-100"
                          aria-label={`Actions for ${chat.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={async () => {
                            const full = await import('@/services/client').then((m) => m.chatsApi.get(chat.id))
                            setExportChat(full)
                          }}
                        >
                          <Download /> Export
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTarget({ id: chat.id, title: chat.title })
                            setRenameValue(chat.title)
                          }}
                        >
                          <Pencil /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => setDeleteTarget({ id: chat.id, title: chat.title })}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))
          )}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImport(f)
              e.target.value = ''
            }}
          />
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Upload className="h-4 w-4" /> Import
            </button>
            <button
              type="button"
              onClick={onNavigateSettings}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameTarget && renameValue.trim()) {
                void renameChat(renameTarget.id, renameValue.trim())
                setRenameTarget(null)
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameTarget && renameValue.trim()) {
                  void renameChat(renameTarget.id, renameValue.trim())
                  setRenameTarget(null)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) void deleteChat(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {exportChat ? <ExportDialog chat={exportChat} open onOpenChange={(o) => !o && setExportChat(null)} /> : null}
    </>
  )
}
