import type { AIErrorPayload, Message, SearchSource, ThinkMode, TokenUsage } from '@shared/types'

export interface StreamOptions {
  webSearch?: boolean
  thinkingMode?: ThinkMode
  model?: string
}

export interface ThinkingMeta {
  mode: ThinkMode
  durationMs: number
  startedAt?: number
  done?: boolean
}

export interface StreamCallbacks {
  onDelta: (text: string) => void
  onReasoning?: (text: string) => void
  onThinking?: (meta: ThinkingMeta) => void
  onSources?: (sources: SearchSource[]) => void
  onUsage?: (usage: TokenUsage, model?: string) => void
  onError: (error: AIErrorPayload) => void
  onDone: () => void
}

export async function streamChat(
  messages: Message[],
  signal: AbortSignal,
  callbacks: StreamCallbacks,
  options: StreamOptions = {},
): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/ai/stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        webSearch: Boolean(options.webSearch),
        thinkingMode: options.thinkingMode ?? 'off',
        deepThink: options.thinkingMode === 'deep',
        model: options.model,
      }),
      signal,
    })
  } catch (err) {
    if (signal.aborted) {
      callbacks.onDone()
      return
    }
    callbacks.onError({
      type: 'no_internet',
      message: err instanceof Error ? err.message : 'Could not reach the server',
    })
    callbacks.onDone()
    return
  }

  if (!res.ok || !res.body) {
    let message = 'Request failed'
    let type: AIErrorPayload['type'] = 'unknown'
    try {
      const data = (await res.json()) as { error?: string; type?: AIErrorPayload['type'] }
      message = data.error || message
      type = data.type || mapStatus(res.status)
    } catch {
      type = mapStatus(res.status)
    }
    callbacks.onError({ type, message, status: res.status })
    callbacks.onDone()
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sawDone = false

  const processChunk = (chunk: string): boolean => {
    const line = chunk.trim()
    if (!line.startsWith('data:')) return true
    const data = line.slice(5).trim()
    if (data === '[DONE]') {
      sawDone = true
      return true
    }
    try {
      const parsed = JSON.parse(data) as {
        error?: { type: AIErrorPayload['type']; message: string; status?: number }
        sources?: SearchSource[]
        thinking?: { mode?: ThinkMode; durationMs?: number; startedAt?: number; done?: boolean }
        choices?: Array<{
          delta?: {
            content?: string
            reasoning_content?: string
            reasoning?: string
          }
          message?: {
            content?: string
            reasoning_content?: string
            reasoning?: string
          }
        }>
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
        }
        model?: string
      }
      if (parsed.error) {
        callbacks.onError(parsed.error)
        callbacks.onDone()
        return false
      }
      if (parsed.thinking && callbacks.onThinking) {
        callbacks.onThinking({
          mode: parsed.thinking.mode ?? 'normal',
          durationMs: parsed.thinking.durationMs ?? 0,
          startedAt: parsed.thinking.startedAt,
          done: parsed.thinking.done,
        })
      }
      if (parsed.sources?.length && callbacks.onSources) {
        callbacks.onSources(parsed.sources)
      }
      const choice = parsed.choices?.[0]
      const reasoning =
        choice?.delta?.reasoning_content ??
        choice?.delta?.reasoning ??
        choice?.message?.reasoning_content ??
        choice?.message?.reasoning
      if (reasoning && callbacks.onReasoning && options.thinkingMode && options.thinkingMode !== 'off') {
        callbacks.onReasoning(reasoning)
      }
      const delta = choice?.delta?.content ?? choice?.message?.content
      if (delta) callbacks.onDelta(delta)
      if (parsed.usage && callbacks.onUsage) {
        callbacks.onUsage(
          {
            promptTokens: parsed.usage.prompt_tokens,
            completionTokens: parsed.usage.completion_tokens,
            totalTokens: parsed.usage.total_tokens,
          },
          parsed.model,
        )
      }
    } catch {
      /* skip */
    }
    return true
  }

  try {
    while (!sawDone) {
      const { done, value } = await reader.read()
      if (done) {
        buffer += decoder.decode()
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''
      for (const chunk of chunks) {
        if (!processChunk(chunk)) return
      }
    }
    if (!sawDone && buffer.trim()) {
      processChunk(buffer)
    }
    if (signal.aborted) {
      callbacks.onDone()
      return
    }
    callbacks.onDone()
  } catch (err) {
    if (signal.aborted) {
      callbacks.onDone()
      return
    }
    callbacks.onError({
      type: 'connection_failed',
      message: err instanceof Error ? err.message : 'Stream interrupted',
    })
    callbacks.onDone()
  }
}

function mapStatus(status: number): AIErrorPayload['type'] {
  if (status === 401 || status === 403) return 'invalid_api_key'
  if (status === 404) return 'model_not_found'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server_error'
  return 'unknown'
}
