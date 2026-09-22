import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { getConfig, ATTACHMENTS_DIR } from './db.ts'
import { webSearch, formatSearchContext } from './web-search.ts'
import type { AIErrorType, AttachmentMeta, Message } from '../shared/types.ts'

export const aiRouter = Router()

interface ChatCompletionMessage {
  role: string
  content: string | Array<Record<string, unknown>>
}

const DEEP_THINK_PROMPT = `[Deep Thinking mode]
Before answering, reason carefully and privately about the problem:
- Restate the goal and constraints
- Consider edge cases, failure modes, and alternative approaches
- Check your logic for contradictions
- Prefer a clear, correct, well-structured final answer

Show only a concise version of your reasoning (if useful), then give the final answer. Be precise. Do not pad with filler.`

const THINK_MIN_MS = 30_000
const THINK_MAX_MS = 300_000

function randomThinkMs(): number {
  return THINK_MIN_MS + Math.floor(Math.random() * (THINK_MAX_MS - THINK_MIN_MS + 1))
}

function waitThink(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

aiRouter.post('/stream', async (req, res) => {
  const config = getConfig()
  const { messages, webSearch: enableSearch, deepThink } = req.body as {
    messages?: Message[]
    webSearch?: boolean
    deepThink?: boolean
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required', type: 'unknown' })
    return
  }
  if (!config.apiBaseURL || !config.model) {
    res.status(400).json({
      error: 'AI is not configured. Open Settings and set your provider, URL, key, and model.',
      type: 'not_configured',
    })
    return
  }

  let searchContext: string | null = null
  let searchHits: Awaited<ReturnType<typeof webSearch>> = []
  if (enableSearch) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const query = lastUser?.content?.trim()
    if (query) {
      searchHits = await webSearch(query, undefined)
      searchContext = formatSearchContext(query, searchHits)
    }
  }

  const apiMessages = await buildApiMessages(messages, config.systemPrompt, {
    deepThink: Boolean(deepThink),
    searchContext,
  })
  const useStream = config.stream !== false

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
  }

  if (searchHits.length) {
    send({ sources: searchHits })
  }

  const sendError = (type: AIErrorType, message: string, status?: number) => {
    send({ error: { type, message, status } })
    res.write('data: [DONE]\n\n')
    res.end()
  }

  const abort = new AbortController()
  req.on('close', () => abort.abort())
  let timeout: NodeJS.Timeout | undefined

  if (deepThink) {
    await waitThink(randomThinkMs(), abort.signal)
    if (abort.signal.aborted) {
      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n')
        res.end()
      }
      return
    }
  }

  try {
    const payload: Record<string, unknown> = {
      model: config.model,
      messages: apiMessages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      top_p: config.topP,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      stream: useStream,
    }
    if (useStream) {
      payload.stream_options = { include_usage: true }
    }

    const base = config.apiBaseURL.replace(/\/+$/, '')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: useStream ? 'text/event-stream' : 'application/json',
    }
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`

    const MAX_CONTINUE = 6
    let continues = 0
    let accumulated = ''
    let finishReason: string | undefined

    const buildContinuePayload = (): Record<string, unknown> => ({
      ...payload,
      messages: [...apiMessages, { role: 'assistant', content: accumulated }],
    })

    while (continues < MAX_CONTINUE) {
      timeout = setTimeout(() => abort.abort(), 600_000)

      const upstream = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(continues === 0 ? payload : buildContinuePayload()),
        signal: abort.signal,
      })

      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '')
        const mapped = mapUpstreamError(upstream.status, text)
        sendError(mapped.type, mapped.message, upstream.status)
        return
      }

      finishReason = undefined

      if (!useStream || !upstream.body) {
        const data = (await upstream.json()) as {
          choices?: {
            message?: { content?: string; reasoning_content?: string; reasoning?: string }
            finish_reason?: string
          }[]
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
          model?: string
        }
        const msg = data.choices?.[0]?.message
        const content = msg?.content ?? ''
        const reasoning = msg?.reasoning_content ?? msg?.reasoning
        finishReason = data.choices?.[0]?.finish_reason
        if (continues > 0 && content) {
          send({
            choices: [{ delta: { content } }],
            model: data.model,
          })
        } else {
          send({
            choices: [{ delta: { content, ...(reasoning ? { reasoning_content: reasoning } : {}) } }],
            model: data.model,
            usage: data.usage
              ? {
                  prompt_tokens: data.usage.prompt_tokens,
                  completion_tokens: data.usage.completion_tokens,
                  total_tokens: data.usage.total_tokens,
                }
              : undefined,
          })
        }
        if (content) accumulated += content
        if (finishReason === 'length' && accumulated && continues < MAX_CONTINUE - 1) {
          continues += 1
          clearTimeout(timeout)
          continue
        }
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }

      const reader = upstream.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let upstreamDone = false

      const processLine = (line: string): boolean => {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) return true
        const dataStr = trimmed.slice(5).trim()
        if (dataStr === '[DONE]') {
          upstreamDone = true
          return true
        }
        try {
          const parsed = JSON.parse(dataStr)
          if (parsed.error) {
            const e = parsed.error
            const type: AIErrorType =
              e.code === 'invalid_api_key' ? 'invalid_api_key'
              : e.code === 'model_not_found' ? 'model_not_found'
              : 'server_error'
            sendError(type, e.message || 'Provider error')
            return false
          }
          const choice = parsed.choices?.[0]
          if (choice?.finish_reason) finishReason = choice.finish_reason
          const delta = choice?.delta?.content ?? choice?.message?.content
          if (typeof delta === 'string' && delta) accumulated += delta
          res.write(`data: ${dataStr}\n\n`)
        } catch {
          // skip malformed chunks
        }
        return true
      }

      while (!upstreamDone) {
        const { done, value } = await reader.read()
        if (done) {
          buffer += decoder.decode()
          break
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!processLine(line)) return
        }
      }

      if (!upstreamDone && buffer.trim()) {
        if (!processLine(buffer)) return
      }

      clearTimeout(timeout)

      if (finishReason === 'length' && accumulated && continues < MAX_CONTINUE - 1) {
        continues += 1
        continue
      }
      break
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    if (abort.signal.aborted && !res.writableEnded) {
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    const msg = err instanceof Error ? err.message : 'Connection failed'
    if (/timeout|abort/i.test(msg)) {
      sendError('timeout', 'The request timed out. Try again or lower max tokens.')
    } else if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) {
      sendError('no_internet', `Could not reach the API endpoint. ${msg}`)
    } else {
      sendError('connection_failed', msg)
    }
  } finally {
    if (timeout) clearTimeout(timeout)
  }
})

async function buildApiMessages(
  messages: Message[],
  systemPrompt: string,
  opts: { deepThink: boolean; searchContext: string | null },
): Promise<ChatCompletionMessage[]> {
  const out: ChatCompletionMessage[] = []
  const systems: string[] = []
  if (systemPrompt.trim()) systems.push(systemPrompt)
  if (opts.deepThink) systems.push(DEEP_THINK_PROMPT)
  if (systems.length) out.push({ role: 'system', content: systems.join('\n\n') })

  const lastIndex = messages.length - 1
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role === 'system') continue
    const attachments = msg.attachments ?? []
    const parts: Array<Record<string, unknown>> = []
    let text = msg.content

    for (const att of attachments) {
      const handled = await attachmentToPart(att)
      if (handled) {
        if (handled.type === 'text' && typeof handled.text === 'string') {
          text = `${text}\n\n${handled.text}`.trim()
        } else {
          parts.push(handled)
        }
      }
    }

    if (opts.searchContext && i === lastIndex && msg.role === 'user') {
      text = `${text}\n\n${opts.searchContext}`
    }

    if (parts.length > 0) {
      const content: Array<Record<string, unknown>> = []
      if (text) content.push({ type: 'text', text })
      content.push(...parts)
      out.push({ role: msg.role, content })
    } else {
      out.push({ role: msg.role, content: text })
    }
  }
  return out
}

async function attachmentToPart(
  att: AttachmentMeta,
): Promise<Record<string, unknown> | null> {
  const filePath = findAttachmentFile(att.id)
  if (!filePath) return null
  if (att.type.startsWith('image/')) {
    const buf = fs.readFileSync(filePath)
    const dataUrl = `data:${att.type};base64,${buf.toString('base64')}`
    return { type: 'image_url', image_url: { url: dataUrl } }
  }
  if (att.type.startsWith('text/') || /\.(md|markdown|txt|log|csv|json|ts|tsx|js|py)$/i.test(att.name)) {
    try {
      const text = fs.readFileSync(filePath, 'utf-8')
      return { type: 'text', text: `[Attached file: ${att.name}]\n${text.slice(0, 100_000)}` }
    } catch {
      return null
    }
  }
  if (att.type === 'application/pdf') {
    return { type: 'text', text: `[User attached a PDF file: ${att.name} (${att.size} bytes)]` }
  }
  return null
}

function findAttachmentFile(id: string): string | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null
  try {
    const files = fs.readdirSync(ATTACHMENTS_DIR)
    const match = files.find((f) => f.startsWith(`${id}.`))
    return match ? path.join(ATTACHMENTS_DIR, match) : null
  } catch {
    return null
  }
}

function mapUpstreamError(status: number, body: string): { type: AIErrorType; message: string } {
  const short = body.slice(0, 400)
  if (status === 401 || status === 403) {
    return { type: 'invalid_api_key', message: 'The API key was rejected by the provider.' }
  }
  if (status === 404) {
    return {
      type: 'model_not_found',
      message: 'Model or endpoint not found. Check the model name and API base URL in Settings.',
    }
  }
  if (status === 429) {
    return { type: 'rate_limited', message: 'Rate limited by the provider. Wait a moment and retry.' }
  }
  if (status >= 500) {
    return { type: 'server_error', message: `Provider server error (${status}). ${short}` }
  }
  return { type: 'server_error', message: `Request failed (${status}). ${short}` }
}
