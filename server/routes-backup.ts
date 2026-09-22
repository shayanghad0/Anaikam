import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { CHATS_DIR, CONFIG_PATH, SESSIONS_PATH, ATTACHMENTS_DIR, readJson, writeJson } from './db.ts'
import type { Chat } from '../shared/types.ts'

export const backupRouter = Router()

interface BackupPayload {
  exportedAt: string
  config: unknown
  sessions: unknown
  chats: Array<{ id: string; data: unknown }>
  attachments: Array<{ id: string; name: string; type: string; data: string }>
}

backupRouter.get('/export', (_req, res) => {
  const chats: Array<{ id: string; data: unknown }> = []
  for (const file of fs.readdirSync(CHATS_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const chat = readJson<Chat | null>(path.join(CHATS_DIR, file), null)
      if (chat?.id) chats.push({ id: chat.id, data: chat })
    } catch { /* skip corrupted files */ }
  }

  const attachments: Array<{ id: string; name: string; type: string; data: string }> = []
  if (fs.existsSync(ATTACHMENTS_DIR)) {
    for (const file of fs.readdirSync(ATTACHMENTS_DIR)) {
      try {
        const filePath = path.join(ATTACHMENTS_DIR, file)
        const buf = fs.readFileSync(filePath)
        const ext = path.extname(file)
        attachments.push({
          id: file.split('.')[0],
          name: file,
          type: ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
            : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp'
            : 'application/octet-stream',
          data: buf.toString('base64'),
        })
      } catch { /* skip */ }
    }
  }

  const payload: BackupPayload = {
    exportedAt: new Date().toISOString(),
    config: readJson(CONFIG_PATH, {}),
    sessions: readJson(SESSIONS_PATH, {}),
    chats,
    attachments,
  }

  const filename = `anaikam-backup-${new Date().toISOString().slice(0, 10)}.json`
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Type', 'application/json')
  res.json(payload)
})

backupRouter.post('/import', async (req, res) => {
  const body = req.body as { file?: string }
  if (!body?.file) {
    res.status(400).json({ error: 'No backup file provided' })
    return
  }

  let payload: BackupPayload
  try {
    payload = JSON.parse(body.file) as BackupPayload
  } catch {
    res.status(400).json({ error: 'Invalid JSON in backup file' })
    return
  }

  if (!payload.exportedAt || !Array.isArray(payload.chats)) {
    res.status(400).json({ error: 'Backup file has invalid structure' })
    return
  }

  // Restore config and sessions
  if (payload.config) writeJson(CONFIG_PATH, payload.config)
  if (payload.sessions) writeJson(SESSIONS_PATH, payload.sessions)

  // Restore chats
  for (const { id, data } of payload.chats) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) continue
    const chat = data as Chat
    if (!chat || !Array.isArray(chat.messages)) continue
    chat.id = id
    chat.updatedAt = Date.now()
    writeJson(path.join(CHATS_DIR, `${id}.json`), chat)
  }

  // Restore attachments
  if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true })
  if (Array.isArray(payload.attachments)) {
    for (const att of payload.attachments ?? []) {
      try {
      const buf = Buffer.from(att.data, 'base64')
        const safeName = (att.name || att.id || 'file').replace(/[^\w.\-]/g, '_').slice(0, 200)
        fs.writeFileSync(path.join(ATTACHMENTS_DIR, safeName), buf)
      } catch { /* skip corrupt attachments */ }
    }
  }

  res.json({ ok: true, chatsRestored: payload.chats.length, attachmentsRestored: payload.attachments?.length ?? 0 })
})
