import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'

function CodeBlock({ className, children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = React.useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const lang = match?.[1]
  const code = String(children).replace(/\n$/, '')

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${lang || 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border border-border bg-muted/40 dark:bg-black">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground dark:text-white/50">
          {lang || 'code'}
        </span>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover/code:opacity-100 focus-within/code:opacity-100">
          <button
            type="button"
            onClick={copy}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={download}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Download code"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <pre {...props} className={cn('overflow-x-auto p-4 !bg-transparent !border-0 rounded-none', className)}>
        {children}
      </pre>
    </div>
  )
}

const MermaidBlock = React.lazy(async () => {
  const [{ default: mermaid }] = await Promise.all([import('mermaid')])
  return {
    default: function MermaidComponent({ code }: { code: string }) {
      const [svg, setSvg] = React.useState<string | null>(null)
      const [error, setError] = React.useState<string | null>(null)

      React.useEffect(() => {
        let cancelled = false
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'neutral'
        mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'strict' })
        mermaid
          .render(`mmd-${Math.random().toString(36).slice(2)}`, code)
          .then(({ svg }) => {
            if (!cancelled) setSvg(svg)
          })
          .catch((err: unknown) => {
            if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render diagram')
          })
        return () => {
          cancelled = true
        }
      }, [code])

      if (error) {
        return (
          <div className="my-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Mermaid error: {error}
          </div>
        )
      }
      if (!svg) {
        return <div className="skeleton my-3 h-40 w-full" />
      }
      return <div className="mermaid-diagram my-3" dangerouslySetInnerHTML={{ __html: svg }} />
    },
  }
})

export function Markdown({ content, className }: { content: string; className?: string }) {
  const { chatSettings } = useSettings()

  const mermaidBlocks = React.useMemo(() => {
    if (!chatSettings.enableMermaid) return { segments: [{ type: 'text' as const, value: content }], codes: [] as string[] }
    const segments: Array<{ type: 'text' | 'mermaid'; value: string; codeIndex?: number }> = []
    const codes: string[] = []
    const re = /```mermaid\n([\s\S]*?)```/g
    let last = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(content))) {
      if (match.index > last) {
        segments.push({ type: 'text', value: content.slice(last, match.index) })
      }
      codes.push(match[1])
      segments.push({ type: 'mermaid', value: match[1], codeIndex: codes.length - 1 })
      last = match.index + match[0].length
    }
    if (last < content.length) segments.push({ type: 'text', value: content.slice(last) })
    if (!codes.length) return { segments: [{ type: 'text' as const, value: content }], codes: [] }
    return { segments, codes }
  }, [content, chatSettings.enableMermaid])

  if (!chatSettings.enableMarkdown) {
    return <div className={cn('whitespace-pre-wrap break-words', className)}>{content}</div>
  }

  const rehypePlugins: Array<[unknown, Record<string, unknown>?]> = []
  if (chatSettings.enableKaTeX) {
    rehypePlugins.push([rehypeKatex, { throwOnError: false, strict: false }])
  }
  rehypePlugins.push([rehypeHighlight, { detect: true, ignoreMissing: true }])

  return (
    <div className={cn('markdown-body', className)}>
      {mermaidBlocks.segments.map((seg, i) => {
        if (seg.type === 'mermaid') {
          return (
            <React.Suspense key={i} fallback={<div className="skeleton my-3 h-40 w-full" />}>
              <MermaidBlock code={seg.value} />
            </React.Suspense>
          )
        }
        if (!seg.value.trim() && mermaidBlocks.segments.length > 1) return null
        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm, ...(chatSettings.enableKaTeX ? [remarkMath] : [])]}
            rehypePlugins={rehypePlugins as never}
            components={{
              pre: ({ children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-lg border border-border">
                  <table>{children}</table>
                </div>
              ),
            }}
          >
            {seg.value}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2" aria-label="Assistant is typing">
      <span className="typing-dot" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot" style={{ animationDelay: '150ms' }} />
      <span className="typing-dot" style={{ animationDelay: '300ms' }} />
    </div>
  )
}
