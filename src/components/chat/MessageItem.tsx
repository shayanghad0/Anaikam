import * as React from 'react'
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  Play,
  Download,
  MoreHorizontal,
  Sparkles,
  Brain,
  Globe,
  ChevronDown,
  Link2,
} from 'lucide-react'
import { cn, formatBytes, formatTime, downloadFile, chatToMarkdown } from '@/lib/utils'
import { Markdown } from '@/components/markdown/Markdown'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { useSettings } from '@/contexts/SettingsContext'
import { useChat } from '@/contexts/ChatContext'
import { attachmentsApi } from '@/services/client'
import type { Chat, Message } from '@shared/types'

function AttachmentChip({ attachment }: { attachment: NonNullable<Message['attachments']>[number] }) {
  const isImage = attachment.type.startsWith('image/')
  if (isImage) {
    return (
      <a href={attachmentsApi.url(attachment.id)} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={attachmentsApi.url(attachment.id)}
          alt={attachment.name}
          loading="lazy"
          className="max-h-48 max-w-full rounded-xl border border-border object-contain"
        />
      </a>
    )
  }
  return (
    <a
      href={attachmentsApi.url(attachment.id)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm transition-colors hover:bg-muted/70"
    >
      <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      <span className="truncate max-w-[180px]">{attachment.name}</span>
      <span className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</span>
    </a>
  )
}

export function MessageItem({
  message,
  isStreamingFinal,
  chat,
  onRegenerate,
  onContinue,
  onEdit,
  onDelete,
  canContinue,
}: {
  message: Message
  isStreamingFinal: boolean
  chat: Chat
  onRegenerate: () => void
  onContinue: () => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  canContinue: boolean
}) {
  const { chatSettings, config } = useSettings()
  const { streaming } = useChat()
  const [copied, setCopied] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(message.content)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const emptyStream = isAssistant && isStreamingFinal && !message.content

  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const exportMessage = () => {
    downloadFile(
      `message-${message.id.slice(0, 8)}.md`,
      chatToMarkdown({ ...chat, messages: [message] }),
      'text/markdown',
    )
  }

  if (editing) {
    return (
      <div className="group flex w-full flex-col gap-2 py-3 animate-fade-up">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(12, Math.max(3, draft.split('\n').length))}
          className="w-full"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              setEditing(false)
              onEdit(message.id, draft)
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(false)
              onEdit(message.id, draft)
            }}
            disabled={!draft.trim()}
          >
            Save & submit
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative flex w-full gap-3 py-3 animate-fade-up',
        isUser && 'flex-row-reverse',
      )}
      data-message-id={message.id}
    >
      {isAssistant ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      ) : null}

      <div className={cn('min-w-0 max-w-[min(100%,52rem)]', isUser && 'flex flex-col items-end')}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-[0.95rem] text-primary-foreground shadow-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          <div className="w-full">
            {message.reasoning ? (
              <ReasoningBlock reasoning={message.reasoning} isStreaming={isStreamingFinal && streaming} />
            ) : null}
            {emptyStream ? (
              <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                <span className="ml-1">Thinking…</span>
              </div>
            ) : (
              <div className={cn(isStreamingFinal && 'streaming-caret')}>
                <Markdown content={message.content} />
              </div>
            )}
            {isAssistant && (message.usedSearch || message.usedDeepThink) ? (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {message.usedSearch ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Globe className="h-3 w-3" /> Searched web
                  </span>
                ) : null}
                {message.usedDeepThink ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Brain className="h-3 w-3" /> Deep think
                  </span>
                ) : null}
              </div>
            ) : null}
            {isAssistant && message.sources?.length ? (
              <SourcesBlock sources={message.sources} />
            ) : null}
          </div>
        )}

        {message.attachments?.length ? (
          <div className={cn('mt-2 flex flex-wrap gap-2', isUser && 'justify-end')}>
            {message.attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} />
            ))}
          </div>
        ) : null}

        {!emptyStream && (message.content || isUser) ? (
          <div
            className={cn(
              'mt-1.5 flex flex-wrap items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100',
              isUser && 'justify-end',
              streaming && isAssistant && 'opacity-100',
            )}
          >
            {chatSettings.showTimestamp ? (
              <span className="px-1 text-[11px] text-muted-foreground tabular-nums">
                {formatTime(message.timestamp)}
              </span>
            ) : null}
            {isAssistant && chatSettings.showTokenCount && message.usage?.totalTokens ? (
              <span className="px-1 text-[11px] text-muted-foreground tabular-nums">
                {message.usage.totalTokens} tokens
              </span>
            ) : null}
            {isAssistant && chatSettings.showModelName && (message.model || config?.model) ? (
              <span className="px-1 text-[11px] text-muted-foreground">
                {message.model || config?.model}
              </span>
            ) : null}

            {isUser ? (
              <>
                <ActionButton label="Copy" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </ActionButton>
                <ActionButton label="Edit" onClick={() => { setDraft(message.content); setEditing(true) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton label="Delete" onClick={() => onDelete(message.id)} danger>
                  <Trash2 className="h-3.5 w-3.5" />
                </ActionButton>
              </>
            ) : null}

            {isAssistant ? (
              <>
                <ActionButton label="Copy" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </ActionButton>
                <ActionButton label="Regenerate" onClick={onRegenerate} disabled={streaming}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </ActionButton>
                {canContinue && !streaming ? (
                  <ActionButton label="Continue" onClick={onContinue}>
                    <Play className="h-3.5 w-3.5" />
                  </ActionButton>
                ) : null}
                <ActionButton label="Export message" onClick={exportMessage}>
                  <Download className="h-3.5 w-3.5" />
                </ActionButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => { setDraft(message.content); setEditing(true) }}>
                      <Pencil /> Edit prompt context
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onClick={() => onDelete(message.id)}>
                      <Trash2 /> Delete message
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  children,
  danger,
  disabled,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none',
        danger && 'hover:text-destructive',
      )}
    >
      {children}
    </button>
  )
}

function ReasoningBlock({ reasoning, isStreaming }: { reasoning: string; isStreaming: boolean }) {
  const [open, setOpen] = React.useState(false)
  const wasStreaming = React.useRef(isStreaming)

  React.useEffect(() => {
    if (isStreaming) {
      wasStreaming.current = true
      setOpen(true)
    } else if (wasStreaming.current) {
      wasStreaming.current = false
      setOpen(false)
    }
  }, [isStreaming])

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-border/80 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Brain className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="flex-1 font-medium">{isStreaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open ? (
        <div className="whitespace-pre-wrap border-t border-border/80 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {reasoning}
        </div>
      ) : null}
    </div>
  )
}

function SourcesBlock({ sources }: { sources: NonNullable<Message['sources']> }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border/80 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Minimize sources' : 'Open sources'}
        title={open ? 'Minimize sources' : 'Open sources'}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/40"
      >
        <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="flex-1 font-medium">Sources</span>
        <span className="text-muted-foreground tabular-nums">{sources.length}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', !open && '-rotate-90')} />
      </button>
      {open ? (
        <ul className="divide-y divide-border/60 border-t border-border/80">
          {sources.map((src, i) => (
            <li key={`${src.url}-${i}`}>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted/50"
              >
                <span className="mt-0.5 w-4 shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground hover:text-primary">
                    {src.title || src.url}
                  </span>
                  <span className="mt-0.5 block truncate text-muted-foreground">{src.url}</span>
                  {src.snippet ? (
                    <span className="mt-1 line-clamp-2 block text-muted-foreground/80">{src.snippet}</span>
                  ) : null}
                </span>
                <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ExportDialog({
  chat,
  open,
  onOpenChange,
}: {
  chat: Chat
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const exportAs = (format: 'md' | 'json' | 'txt') => {
    const base = chat.title.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'chat'
    if (format === 'json') {
      downloadFile(`${base}.json`, JSON.stringify(chat, null, 2), 'application/json')
    } else if (format === 'md') {
      downloadFile(`${base}.md`, chatToMarkdown(chat), 'text/markdown')
    } else {
      const lines = chat.messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n')
      downloadFile(`${base}.txt`, `${chat.title}\n\n${lines}`, 'text/plain')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export conversation</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start" onClick={() => exportAs('md')}>
            Markdown (.md)
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => exportAs('json')}>
            JSON (.json)
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => exportAs('txt')}>
            Plain text (.txt)
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
