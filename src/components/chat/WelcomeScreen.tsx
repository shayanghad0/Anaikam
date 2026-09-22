import { MessageSquare, Code2, Lightbulb, PenLine } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useChat } from '@/contexts/ChatContext'
import { useSettings } from '@/contexts/SettingsContext'

const SUGGESTIONS = [
  { icon: PenLine, label: 'Draft a professional email', prompt: 'Help me draft a professional email to a client about a project delay.' },
  { icon: Code2, label: 'Explain some code', prompt: 'Explain how this code works, step by step:\n\n```ts\nconst debounce = (fn, ms) => {\n  let t\n  return (...args) => {\n    clearTimeout(t)\n    t = setTimeout(() => fn(...args), ms)\n  }\n}\n```' },
  { icon: Lightbulb, label: 'Brainstorm ideas', prompt: 'Brainstorm 10 creative side-project ideas I could build in a weekend.' },
  { icon: MessageSquare, label: 'Summarize a topic', prompt: 'Give me a clear, structured summary of how transformers work in ML.' },
]

export function WelcomeScreen() {
  const { newChat, sendMessage, activeChat } = useChat()
  const { config } = useSettings()
  const navigate = useNavigate()

  const run = async (prompt: string) => {
    if (!activeChat) {
      await newChat()
    }
    await sendMessage(prompt, [])
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="animate-fade-up w-full max-w-2xl">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-soft">
          <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" />
            <path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How can <span className="gradient-text">I help</span> today?
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {config?.model
            ? `Private, local-first assistant powered by ${config.model}.`
            : 'Your private, provider-agnostic AI assistant. Configure a model to begin.'}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => void run(s.prompt)}
              className="group cursor-pointer rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <s.icon className="mb-2 h-4 w-4 text-primary transition-transform group-hover:scale-110" />
              <p className="text-sm font-medium">{s.label}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.prompt.split('\n')[0]}</p>
            </button>
          ))}
        </div>

        {!config?.apiBaseURL || !config?.model ? (
          <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              Set your <span className="font-medium text-foreground">Provider, API Base URL, API Key, and Model</span> in
              Settings — works with any OpenAI-compatible API.
            </p>
            <Button className="mt-3" onClick={() => navigate('/settings')}>
              Open Settings
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
