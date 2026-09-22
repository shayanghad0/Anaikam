import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto'
import { createSession, destroySession, getConfig, validateSession } from './db.ts'

export const SESSION_COOKIE = 'lcb_session'

export function getSessionToken(req: Request): string | undefined {
  const raw = req.headers.cookie
  if (!raw) return undefined
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === SESSION_COOKIE) return rest.join('=')
  }
  return undefined
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (validateSession(getSessionToken(req))) {
    next()
    return
  }
  res.status(401).json({ error: 'Unauthorized' })
}

export function handleLogin(req: Request, res: Response): void {
  const { username, password } = req.body as { username?: string; password?: string }
  const config = getConfig()
  if (!username || !password) {
    res.status(400).json({ ok: false, error: 'Username and password are required' })
    return
  }
  const userMatch = username === config.username
  const passMatch = timingSafeEqual(password, config.password)
  if (!userMatch || !passMatch) {
    res.status(401).json({ ok: false, error: 'Invalid username or password' })
    return
  }
  const { token, expiresAt } = createSession()
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
  res.json({ ok: true, username: config.username })
}

export function handleLogout(req: Request, res: Response): void {
  destroySession(getSessionToken(req))
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
}

export function handleSession(req: Request, res: Response): void {
  if (validateSession(getSessionToken(req))) {
    res.json({ ok: true, username: getConfig().username })
  } else {
    res.status(401).json({ ok: false })
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return nodeTimingSafeEqual(bufA, bufB)
}
