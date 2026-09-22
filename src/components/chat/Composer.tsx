import * as React from 'react'
import { Paperclip, Send, Square, X, FileText, Sparkles, Globe, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/contexts/ChatContext'
import { useSettings } from '@/contexts/SettingsContext'
import { attachmentsApi } from '@/services/client'
import { cn, formatBytes } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { AttachmentMeta } from '@shared/types'

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown,.md,.txt,.csv,.json'

export function Composer() {
  const { sendMessage, streaming, stopGeneration, webSearch, deepThink, setWebSearch, setDeepThink } = useChat()
  const { config } = useSettings()
  const { toast } = useToast()
  const [value, setValue] = React.useState('')
  const [attachments, setAttachments] = React.useState<AttachmentMeta[]>([])
  const [uploading, setUploading] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const resize = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [])

  React.useEffect(() => {
    resize()
  }, [value, resize])

  const submit = async () => {
    if (streaming || uploading) return
    if (!value.trim() && attachments.length === 0) return
    if (!config?.model || !config?.apiBaseURL) {
      toast({
        title: 'AI not configured',
        description: 'Set your provider, URL, key, and model in Settings first.',
        variant: 'destructive',
      })
      return
    }
    const atts = attachments
    setValue('')
    setAttachments([])
    requestAnimationFrame(resize)
    await sendMessage(value, atts)
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast({ title: 'File too large', description: `${file.name} exceeds 20MB`, variant: 'destructive' })
          continue
        }
        const meta = await attachmentsApi.upload(file)
        setAttachments((prev) => [...prev, meta])
      }
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload file',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border-t border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto w-full px-4 pb-4 pt-3" style={{ maxWidth: 'var(--chat-width)' }}>
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-sm animate-fade-up"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[140px] truncate">{att.name}</span>
                <span className="text-muted-foreground">{formatBytes(att.size)}</span>
                <button
                  type="button"
                  className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${att.name}`}
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft transition-shadow focus-within:border-primary/40',
          )}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Attach files"
            className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>

          <ModeToggle
            active={webSearch}
            onClick={() => setWebSearch(!webSearch)}
            label="Search the web"
            icon={<Globe className="h-4 w-4" />}
          />
          <ModeToggle
            active={deepThink}
            onClick={() => setDeepThink(!deepThink)}
            label="Deep thinking"
            icon={<Brain className="h-4 w-4" />}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            placeholder="Ask anything…"
            rows={1}
            className="max-h-[220px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Message"
          />

          {streaming ? (
            <Button size="icon" variant="secondary" onClick={stopGeneration} aria-label="Stop generation" className="rounded-xl">
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => void submit()}
              disabled={!value.trim() && attachments.length === 0 || uploading}
              aria-label="Send message"
              className="rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {uploading ? (
            'Uploading…'
          ) : (
            <>
              <Sparkles className="mr-1 inline h-3 w-3 align-[-2px] text-primary" />
              {config?.model ? `${config.model}` : 'Configure a model in Settings'}
              {webSearch ? ' · Search' : ''}
              {deepThink ? ' · Deep Think' : ''}
              {' · Enter to send, Shift+Enter for newline'}
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function ModeToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={active ? `${label} on` : `${label} off`}
      className={cn(
        'cursor-pointer rounded-lg p-2 transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
    </button>
  )
}
