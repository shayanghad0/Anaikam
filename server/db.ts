import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import {
  defaultConfig,
  type AppConfig,
  type AppearanceSettings,
  type Chat,
  type ChatDisplaySettings,
  type ChatSummary,
} from '../shared/types.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT_DIR = path.resolve(__dirname, '..')
export const DB_DIR = path.join(ROOT_DIR, 'database')
export const CHATS_DIR = path.join(DB_DIR, 'chats')
export const ATTACHMENTS_DIR = path.join(DB_DIR, 'attachments')
const CONFIG_PATH = path.join(DB_DIR, 'config.json')
const SESSIONS_PATH = path.join(DB_DIR, 'sessions.json')

interface SessionsFile {
  sessions: Record<string, { expiresAt: number }>
}

function ensureDirs(): void {
  for (const dir of [DB_DIR, CHATS_DIR, ATTACHMENTS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown): void {
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filePath)
}

export function initDatabase(): void {
  ensureDirs()
  if (!fs.existsSync(CONFIG_PATH)) {
    writeJson(CONFIG_PATH, defaultConfig())
  } else {
    const existing = readJson<Partial<AppConfig>>(CONFIG_PATH, {})
    const merged: AppConfig = {
      ...defaultConfig(),
      ...existing,
      appearance: { ...defaultConfig().appearance, ...existing.appearance },
      chat: { ...defaultConfig().chat, ...existing.chat },
    }
    writeJson(CONFIG_PATH, merged)
  }
  if (!fs.existsSync(SESSIONS_PATH)) {
    writeJson(SESSIONS_PATH, { sessions: {} } satisfies SessionsFile)
  }
}

export function getConfig(): AppConfig {
  const cfg = readJson<Partial<AppConfig>>(CONFIG_PATH, {})
  const base = defaultConfig()
  return {
    ...base,
    ...cfg,
    appearance: { ...base.appearance, ...cfg.appearance },
    chat: { ...base.chat, ...cfg.chat },
  }
}

export function saveConfig(config: AppConfig): void {
  writeJson(CONFIG_PATH, config)
}

export interface ConfigPatch extends Partial<Omit<AppConfig, 'appearance' | 'chat'>> {
  appearance?: Partial<AppearanceSettings>
  chat?: Partial<ChatDisplaySettings>
}

export function updateConfig(patch: ConfigPatch): AppConfig {
  const current = getConfig()
  const next: AppConfig = {
    ...current,
    ...patch,
    appearance: { ...current.appearance, ...(patch.appearance ?? {}) },
    chat: { ...current.chat, ...(patch.chat ?? {}) },
  }
  saveConfig(next)
  return next
}

export function createSession(): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30
  const data = readJson<SessionsFile>(SESSIONS_PATH, { sessions: {} })
  const now = Date.now()
  for (const [key, val] of Object.entries(data.sessions)) {
    if (val.expiresAt < now) delete data.sessions[key]
  }
  data.sessions[token] = { expiresAt }
  writeJson(SESSIONS_PATH, data)
  return { token, expiresAt }
}

export function validateSession(token: string | undefined): boolean {
  if (!token) return false
  const data = readJson<SessionsFile>(SESSIONS_PATH, { sessions: {} })
  const session = data.sessions[token]
  if (!session) return false
  if (session.expiresAt < Date.now()) {
    delete data.sessions[token]
    writeJson(SESSIONS_PATH, data)
    return false
  }
  return true
}

export function destroySession(token: string | undefined): void {
  if (!token) return
  const data = readJson<SessionsFile>(SESSIONS_PATH, { sessions: {} })
  if (data.sessions[token]) {
    delete data.sessions[token]
    writeJson(SESSIONS_PATH, data)
  }
}

function chatPath(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid chat id')
  return path.join(CHATS_DIR, `${id}.json`)
}

export function listChats(): ChatSummary[] {
  ensureDirs()
  const files = fs.readdirSync(CHATS_DIR).filter((f) => f.endsWith('.json'))
  const summaries: ChatSummary[] = []
  for (const file of files) {
    try {
      const chat = readJson<Chat | null>(path.join(CHATS_DIR, file), null)
      if (!chat || !chat.id) continue
      const last = chat.messages[chat.messages.length - 1]
      summaries.push({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length,
        preview: (last?.content ?? '').slice(0, 120),
      })
    } catch {
      continue
    }
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getChat(id: string): Chat | null {
  try {
    return readJson<Chat | null>(chatPath(id), null)
  } catch {
    return null
  }
}

export function readChatFileSafe(filePath: string): Chat | null {
  try {
    const chat = readJson<Chat | null>(filePath, null)
    if (!chat || !chat.id || !Array.isArray(chat.messages)) return null
    return chat
  } catch {
    return null
  }
}

export function saveChat(chat: Chat): void {
  ensureDirs()
  writeJson(chatPath(chat.id), chat)
}

export function deleteChat(id: string): boolean {
  try {
    const p = chatPath(id)
    if (!fs.existsSync(p)) return false
    fs.unlinkSync(p)
    return true
  } catch {
    return false
  }
}

export function attachmentPath(id: string): string | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null
  const files = fs.readdirSync(ATTACHMENTS_DIR)
  const match = files.find((f) => f.startsWith(`${id}.`))
  return match ? path.join(ATTACHMENTS_DIR, match) : null
}

export function saveAttachment(id: string, name: string, data: Buffer): string {
  ensureDirs()
  const safeExt = path.extname(name).slice(0, 16).replace(/[^a-zA-Z0-9.]/g, '')
  const filePath = path.join(ATTACHMENTS_DIR, `${id}${safeExt}`)
  fs.writeFileSync(filePath, data)
  return filePath
}
