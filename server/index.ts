import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import fs from 'node:fs'
import { initDatabase } from './db.ts'
import { handleLogin, handleLogout, handleSession, requireAuth } from './auth.ts'
import { configRouter } from './routes-config.ts'
import { chatsRouter } from './routes-chats.ts'
import { attachmentsRouter } from './routes-attachments.ts'
import { aiRouter } from './routes-ai.ts'
import { backupRouter } from './routes-backup.ts'
import { ROOT_DIR } from './db.ts'

const PORT = Number(process.env.PORT || 3001)

initDatabase()

const app = express()
app.use(express.json({ limit: '50mb' }))
app.use(cookieParser())

app.post('/api/auth/login', handleLogin)
app.post('/api/auth/logout', handleLogout)
app.get('/api/auth/session', handleSession)

app.use('/api/config', requireAuth, configRouter)
app.use('/api/chats', requireAuth, chatsRouter)
app.use('/api/attachments', requireAuth, attachmentsRouter)
app.use('/api/ai', requireAuth, aiRouter)
app.use('/api/backup', requireAuth, backupRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(ROOT_DIR, 'dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'))
    })
  }
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Local ChatBot API listening on http://127.0.0.1:${PORT}`)
})
