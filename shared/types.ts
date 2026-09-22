export type Role = 'user' | 'assistant' | 'system'

export interface AttachmentMeta {
  id: string
  name: string
  type: string
  size: number
}

export interface TokenUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export interface SearchSource {
  title: string
  url: string
  snippet?: string
}

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  attachments?: AttachmentMeta[]
  usage?: TokenUsage
  model?: string
  error?: boolean
  reasoning?: string
  usedSearch?: boolean
  usedDeepThink?: boolean
  sources?: SearchSource[]
}

export interface Chat {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface ChatSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  preview: string
}

export interface SearchMatch {
  role: Role
  snippet: string
}

export interface SearchResult {
  id: string
  title: string
  updatedAt: number
  matches: SearchMatch[]
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  chatWidth: number
  fontSize: number
}

export interface ChatDisplaySettings {
  autoScroll: boolean
  showTokenCount: boolean
  showModelName: boolean
  showTimestamp: boolean
  enableMarkdown: boolean
  enableMermaid: boolean
  enableKaTeX: boolean
  webSearch: boolean
  deepThink: boolean
}

export interface AppConfig {
  username: string
  password: string
  apiProviderName: string
  apiBaseURL: string
  apiKey: string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  stream: boolean
  appearance: AppearanceSettings
  chat: ChatDisplaySettings
}

export interface PublicConfig {
  username: string
  apiProviderName: string
  apiBaseURL: string
  hasApiKey: boolean
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  stream: boolean
  appearance: AppearanceSettings
  chat: ChatDisplaySettings
}

export interface ConfigUpdate {
  username?: string
  currentPassword?: string
  password?: string
  apiProviderName?: string
  apiBaseURL?: string
  apiKey?: string
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
  stream?: boolean
  appearance?: Partial<AppearanceSettings>
  chat?: Partial<ChatDisplaySettings>
}

export type AIErrorType =
  | 'invalid_api_key'
  | 'connection_failed'
  | 'model_not_found'
  | 'timeout'
  | 'rate_limited'
  | 'no_internet'
  | 'server_error'
  | 'not_configured'
  | 'unknown'

export interface AIErrorPayload {
  type: AIErrorType
  message: string
  status?: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  ok: boolean
  username?: string
  error?: string
}

export interface AttachmentUploadResponse {
  id: string
  name: string
  type: string
  size: number
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'dark',
  accentColor: '#7C3AED',
  chatWidth: 768,
  fontSize: 16,
}

export const DEFAULT_CHAT_SETTINGS: ChatDisplaySettings = {
  autoScroll: true,
  showTokenCount: true,
  showModelName: true,
  showTimestamp: true,
  enableMarkdown: true,
  enableMermaid: true,
  enableKaTeX: true,
  webSearch: false,
  deepThink: false,
}

export function defaultConfig(): AppConfig {
  return {
    username: 'admin',
    password: 'admin123',
    apiProviderName: '',
    apiBaseURL: '',
    apiKey: '',
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    stream: true,
    appearance: { ...DEFAULT_APPEARANCE },
    chat: { ...DEFAULT_CHAT_SETTINGS },
  }
}
