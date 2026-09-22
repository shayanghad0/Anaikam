import { Router } from 'express'
import { getConfig, updateConfig } from './db.ts'
import type { ConfigUpdate, PublicConfig } from '../shared/types.ts'

export const configRouter = Router()

function toPublic(): PublicConfig {
  const c = getConfig()
  return {
    username: c.username,
    apiProviderName: c.apiProviderName,
    apiBaseURL: c.apiBaseURL,
    hasApiKey: Boolean(c.apiKey),
    model: c.model,
    models: c.models ?? [],
    systemPrompt: c.systemPrompt,
    temperature: c.temperature,
    maxTokens: c.maxTokens,
    topP: c.topP,
    presencePenalty: c.presencePenalty,
    frequencyPenalty: c.frequencyPenalty,
    stream: c.stream,
    appearance: c.appearance,
    chat: c.chat,
  }
}

configRouter.get('/', (_req, res) => {
  res.json(toPublic())
})

configRouter.put('/', (req, res) => {
  const body = req.body as ConfigUpdate
  const current = getConfig()
  const patch: import('./db.ts').ConfigPatch = {}

  if (typeof body.username === 'string' && body.username.trim()) {
    if (body.password) {
      if (body.currentPassword !== current.password) {
        res.status(400).json({ error: 'Current password is incorrect' })
        return
      }
      patch.password = body.password
    }
    patch.username = body.username.trim()
  } else if (body.password) {
    if (body.currentPassword !== current.password) {
      res.status(400).json({ error: 'Current password is incorrect' })
      return
    }
    patch.password = body.password
  }

  if (typeof body.apiProviderName === 'string') patch.apiProviderName = body.apiProviderName
  if (typeof body.apiBaseURL === 'string') patch.apiBaseURL = body.apiBaseURL.trim().replace(/\/+$/, '')
  if (typeof body.apiKey === 'string' && body.apiKey.length > 0) patch.apiKey = body.apiKey
  if (typeof body.model === 'string') patch.model = body.model
  if (Array.isArray(body.models)) patch.models = body.models
  if (typeof body.systemPrompt === 'string') patch.systemPrompt = body.systemPrompt
  if (typeof body.temperature === 'number') patch.temperature = clamp(body.temperature, 0, 2)
  if (typeof body.maxTokens === 'number') patch.maxTokens = Math.round(clamp(body.maxTokens, 1, 1_000_000))
  if (typeof body.topP === 'number') patch.topP = clamp(body.topP, 0, 1)
  if (typeof body.presencePenalty === 'number') patch.presencePenalty = clamp(body.presencePenalty, -2, 2)
  if (typeof body.frequencyPenalty === 'number') patch.frequencyPenalty = clamp(body.frequencyPenalty, -2, 2)
  if (typeof body.stream === 'boolean') patch.stream = body.stream
  if (body.appearance) patch.appearance = body.appearance
  if (body.chat) patch.chat = body.chat

  updateConfig(patch)
  res.json(toPublic())
})

configRouter.post('/test', async (_req, res) => {
  const config = getConfig()
  if (!config.apiBaseURL) {
    res.status(400).json({ ok: false, error: 'API Base URL is not configured', type: 'not_configured' })
    return
  }
  const base = config.apiBaseURL.replace(/\/+$/, '')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`

  try {
    const modelsRes = await fetch(`${base}/models`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    })
    if (modelsRes.ok) {
      const data = (await modelsRes.json()) as { data?: { id: string }[] }
      const models = (data.data ?? []).map((m) => m.id)
      if (config.model && models.length && !models.includes(config.model)) {
        res.json({
          ok: true,
          warning: `Connected, but model "${config.model}" was not found in the model list`,
          modelCount: models.length,
        })
        return
      }
      res.json({ ok: true, modelCount: models.length })
      return
    }
    if (modelsRes.status === 401 || modelsRes.status === 403) {
      res.status(401).json({ ok: false, error: 'Invalid API key', type: 'invalid_api_key' })
      return
    }
  } catch {
    // fall through to chat probe
  }

  try {
    const chatRes = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model || (config.models?.[0] || 'gpt-4o-mini'),
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (chatRes.ok) {
      res.json({ ok: true })
      return
    }
    const text = await chatRes.text()
    if (chatRes.status === 401 || chatRes.status === 403) {
      res.status(401).json({ ok: false, error: 'Invalid API key', type: 'invalid_api_key' })
    } else if (chatRes.status === 404) {
      res.status(404).json({ ok: false, error: 'Model or endpoint not found', type: 'model_not_found' })
    } else if (chatRes.status === 429) {
      res.status(429).json({ ok: false, error: 'Rate limited by provider', type: 'rate_limited' })
    } else {
      res.status(502).json({
        ok: false,
        error: `Provider error (${chatRes.status}): ${text.slice(0, 300)}`,
        type: 'server_error',
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed'
    const type = /timeout|abort/i.test(msg) ? 'timeout' : 'connection_failed'
    res.status(502).json({ ok: false, error: msg, type })
  }
})

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
