import { Router } from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  deleteChat,
  getChat,
  listChats,
  saveChat,
  CHATS_DIR,
  readChatFileSafe,
} from './db.ts'
import type { Chat, Message, SearchResult } from '../shared/types.ts'

export const chatsRouter = Router()

chatsRouter.get('/', (_req, res) => {
  res.json(listChats())
})

chatsRouter.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase()
  if (!q) {
    res.json([])
    return
  }
  const files = fs.readdirSync(CHATS_DIR).filter((f) => f.endsWith('.json'))
  const results: SearchResult[] = []
  for (const file of files) {
    const chat = readChatFileSafe(path.join(CHATS_DIR, file))
    if (!chat) continue
    const matches: SearchResult['matches'] = []
    if (chat.title.toLowerCase().includes(q)) {
      matches.push({ role: 'system', snippet: chat.title })
    }
    for (const msg of chat.messages) {
      const idx = msg.content.toLowerCase().indexOf(q)
      if (idx !== -1) {
        const start = Math.max(0, idx - 40)
        const snippet = (start > 0 ? '…' : '') + msg.content.slice(start, idx + q.length + 60)
        matches.push({ role: msg.role, snippet })
        if (matches.length >= 4) break
      }
    }
    if (matches.length) {
      results.push({ id: chat.id, title: chat.title, updatedAt: chat.updatedAt, matches })
    }
  }
  results.sort((a, b) => b.updatedAt - a.updatedAt)
  res.json(results.slice(0, 50))
})

chatsRouter.post('/', (req, res) => {
  const now = Date.now()
  const chat: Chat = {
    id: crypto.randomUUID(),
    title: String(req.body?.title ?? 'New chat'),
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
  saveChat(chat)
  res.status(201).json(chat)
})

chatsRouter.get('/:id', (req, res) => {
  const chat = getChat(req.params.id)
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' })
    return
  }
  res.json(chat)
})

chatsRouter.patch('/:id', (req, res) => {
  const chat = getChat(req.params.id)
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' })
    return
  }
  const body = req.body as { title?: string; messages?: Message[] }
  if (typeof body.title === 'string' && body.title.trim()) {
    chat.title = body.title.trim().slice(0, 200)
  }
  if (Array.isArray(body.messages)) {
    chat.messages = body.messages
  }
  chat.updatedAt = Date.now()
  saveChat(chat)
  res.json(chat)
})

chatsRouter.delete('/:id', (req, res) => {
  const ok = deleteChat(req.params.id)
  if (!ok) {
    res.status(404).json({ error: 'Chat not found' })
    return
  }
  res.json({ ok: true })
})

chatsRouter.post('/import', (req, res) => {
  const incoming = req.body as Partial<Chat> & { messages?: Message[] }
  if (!incoming || !Array.isArray(incoming.messages)) {
    res.status(400).json({ error: 'Invalid chat JSON' })
    return
  }
  const now = Date.now()
  const chat: Chat = {
    id: crypto.randomUUID(),
    title: String(incoming.title ?? 'Imported chat').slice(0, 200),
    createdAt: Number(incoming.createdAt) || now,
    updatedAt: now,
    messages: incoming.messages.map((m) => ({
      id: m.id || crypto.randomUUID(),
      role: m.role,
      content: String(m.content ?? ''),
      timestamp: Number(m.timestamp) || now,
      attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
      usage: m.usage,
      model: m.model,
      error: m.error,
    })),
  }
  saveChat(chat)
  res.status(201).json(chat)
})
