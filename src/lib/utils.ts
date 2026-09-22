import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function groupChatsByDate<T extends { updatedAt: number }>(
  chats: T[],
): Array<{ label: string; items: T[] }> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const sevenDaysAgo = startOfToday - 7 * 86_400_000

  const groups: Record<string, T[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  }

  for (const chat of chats) {
    if (chat.updatedAt >= startOfToday) groups.Today.push(chat)
    else if (chat.updatedAt >= startOfYesterday) groups.Yesterday.push(chat)
    else if (chat.updatedAt >= sevenDaysAgo) groups['Previous 7 Days'].push(chat)
    else groups.Older.push(chat)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function chatToMarkdown(chat: {
  title: string
  updatedAt: number
  messages: Array<{
    role: string
    content: string
    timestamp: number
    reasoning?: string
    sources?: Array<{ title: string; url: string }>
  }>
}): string {
  const lines: string[] = [`# ${chat.title}`, '', `> Exported ${new Date(chat.updatedAt).toLocaleString()}`, '']
  for (const msg of chat.messages) {
    const who = msg.role === 'user' ? 'You' : 'Assistant'
    lines.push(`### ${who} · ${new Date(msg.timestamp).toLocaleString()}`, '', msg.content, '')
    if (msg.reasoning) {
      lines.push('<details><summary>Thought process</summary>', '', msg.reasoning, '', '</details>', '')
    }
    if (msg.sources?.length) {
      lines.push('**Sources**', '')
      for (const [i, src] of msg.sources.entries()) {
        lines.push(`${i + 1}. [${src.title || src.url}](${src.url})`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

export function chatToTxt(chat: {
  title: string
  messages: Array<{
    role: string
    content: string
    reasoning?: string
    sources?: Array<{ title: string; url: string }>
  }>
}): string {
  const lines: string[] = [chat.title, '='.repeat(chat.title.length), '']
  for (const msg of chat.messages) {
    const who = msg.role === 'user' ? 'You' : 'Assistant'
    lines.push(`[${who}]`, msg.content, '')
    if (msg.reasoning) lines.push('[Thinking]', msg.reasoning, '')
    if (msg.sources?.length) {
      lines.push('[Sources]')
      for (const [i, src] of msg.sources.entries()) lines.push(`${i + 1}. ${src.title} — ${src.url}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

export function titleFromPrompt(prompt: string): string {
  const clean = prompt.replace(/\s+/g, ' ').trim()
  if (clean.length <= 48) return clean || 'New chat'
  return `${clean.slice(0, 48).trimEnd()}…`
}

export function hexToHslString(hex: string): string {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
