import { Router } from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { getConfig, saveAttachment, attachmentPath } from './db.ts'
import type { AttachmentMeta } from '../shared/types.ts'

export const attachmentsRouter = Router()

const MAX_SIZE = 20 * 1024 * 1024

attachmentsRouter.post('/', (req, res) => {
  const { name, type, data } = req.body as { name?: string; type?: string; data?: string }
  if (!name || !data) {
    res.status(400).json({ error: 'name and data are required' })
    return
  }
  let buffer: Buffer
  try {
    buffer = Buffer.from(data, 'base64')
  } catch {
    res.status(400).json({ error: 'Invalid base64 data' })
    return
  }
  if (buffer.length > MAX_SIZE) {
    res.status(413).json({ error: 'File too large (max 20MB)' })
    return
  }
  const id = crypto.randomUUID()
  saveAttachment(id, name, buffer)
  const meta: AttachmentMeta = {
    id,
    name: name.slice(0, 255),
    type: type || 'application/octet-stream',
    size: buffer.length,
  }
  res.status(201).json(meta)
})

attachmentsRouter.get('/:id', (req, res) => {
  const filePath = attachmentPath(req.params.id)
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Attachment not found' })
    return
  }
  const config = getConfig()
  void config
  const name = filePath.split(/[\\/]/).pop() ?? 'file'
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const mime = ext === 'png' ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'gif' ? 'image/gif'
    : ext === 'webp' ? 'image/webp'
    : ext === 'svg' ? 'image/svg+xml'
    : ext === 'pdf' ? 'application/pdf'
    : ext === 'md' || ext === 'markdown' ? 'text/markdown'
    : ext === 'txt' || ext === 'log' ? 'text/plain'
    : 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  res.setHeader('Cache-Control', 'private, max-age=86400')
  fs.createReadStream(filePath).pipe(res)
})
