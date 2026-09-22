import { api } from './api'
import type {
  AppConfig,
  AttachmentMeta,
  AttachmentUploadResponse,
  AuthResponse,
  Chat,
  ChatSummary,
  ConfigUpdate,
  Message,
  PublicConfig,
  SearchResult,
} from '@shared/types'

export const authApi = {
  session: () => api.get<{ ok: boolean; username?: string }>('/api/auth/session'),
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { username, password }),
  logout: () => api.post<{ ok: boolean }>('/api/auth/logout'),
}

export const configApi = {
  get: () => api.get<PublicConfig>('/api/config'),
  update: (patch: ConfigUpdate) => api.put<PublicConfig>('/api/config', patch),
  test: () =>
    api.post<{ ok: boolean; warning?: string; error?: string; type?: string; modelCount?: number }>(
      '/api/config/test',
    ),
}

export const chatsApi = {
  list: () => api.get<ChatSummary[]>('/api/chats'),
  get: (id: string) => api.get<Chat>(`/api/chats/${id}`),
  create: (title = 'New chat') => api.post<Chat>('/api/chats', { title }),
  update: (id: string, patch: { title?: string; messages?: Message[] }) =>
    api.patch<Chat>(`/api/chats/${id}`, patch),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/api/chats/${id}`),
  search: (q: string) => api.get<SearchResult[]>(`/api/chats/search?q=${encodeURIComponent(q)}`),
  import: (chat: Partial<Chat> & { messages: Message[] }) => api.post<Chat>('/api/chats/import', chat),
}

export const attachmentsApi = {
  upload: async (file: File): Promise<AttachmentMeta> => {
    const data = await fileToBase64(file)
    return api.post<AttachmentUploadResponse>('/api/attachments', {
      name: file.name,
      type: file.type || 'application/octet-stream',
      data,
    })
  },
  url: (id: string) => `/api/attachments/${id}`,
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export type { AppConfig }
