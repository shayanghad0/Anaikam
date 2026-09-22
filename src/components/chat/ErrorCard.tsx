import * as React from 'react'
import { AlertTriangle, KeyRound, Globe, Clock, ServerCrash, WifiOff, Settings2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AIErrorPayload } from '@shared/types'

const ERROR_META: Record<
  AIErrorPayload['type'],
  { icon: React.ElementType; title: string; hint: string; tone: string }
> = {
  invalid_api_key: {
    icon: KeyRound,
    title: 'Invalid API key',
    hint: 'The provider rejected your key. Update it in Settings → AI Configuration.',
    tone: 'text-amber-500',
  },
  connection_failed: {
    icon: Globe,
    title: 'Connection failed',
    hint: 'Could not reach the API endpoint. Check the base URL and your network.',
    tone: 'text-amber-500',
  },
  model_not_found: {
    icon: HelpCircle,
    title: 'Model not found',
    hint: 'The model name or endpoint is wrong. Verify it in Settings.',
    tone: 'text-amber-500',
  },
  timeout: {
    icon: Clock,
    title: 'Request timed out',
    hint: 'The model took too long to respond. Retry, or lower max tokens.',
    tone: 'text-amber-500',
  },
  rate_limited: {
    icon: AlertTriangle,
    title: 'Rate limited',
    hint: 'Too many requests. Wait a moment before trying again.',
    tone: 'text-orange-500',
  },
  no_internet: {
    icon: WifiOff,
    title: 'No internet',
    hint: 'You appear to be offline, or the local API server is not running.',
    tone: 'text-red-500',
  },
  server_error: {
    icon: ServerCrash,
    title: 'Server error',
    hint: 'The provider returned an error. Try again shortly.',
    tone: 'text-red-500',
  },
  not_configured: {
    icon: Settings2,
    title: 'AI not configured',
    hint: 'Set Provider, API Base URL, API Key, and Model in Settings to start chatting.',
    tone: 'text-primary',
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    hint: 'An unexpected error occurred. Try regenerating the response.',
    tone: 'text-red-500',
  },
}

export function ErrorCard({
  error,
  onRetry,
  onOpenSettings,
}: {
  error: AIErrorPayload
  onRetry?: () => void
  onOpenSettings?: () => void
}) {
  const meta = ERROR_META[error.type] ?? ERROR_META.unknown
  const Icon = meta.icon

  return (
    <div
      role="alert"
      className="animate-fade-up my-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${meta.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{meta.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{meta.hint}</p>
          {error.message && error.type !== 'not_configured' ? (
            <p className="mt-2 rounded-lg bg-muted px-3 py-2 font-mono text-xs break-words text-muted-foreground">
              {error.message}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry ? (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
            {error.type === 'not_configured' || error.type === 'invalid_api_key' || error.type === 'model_not_found' ? (
              onOpenSettings ? (
                <Button size="sm" onClick={onOpenSettings}>
                  Open Settings
                </Button>
              ) : null
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
