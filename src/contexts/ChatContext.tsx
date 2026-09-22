import * as React from 'react'
import { chatsApi } from '@/services/client'
import { streamChat } from '@/services/stream'
import { titleFromPrompt } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import type {
  AIErrorPayload,
  AttachmentMeta,
  Chat,
  ChatSummary,
  Message,
  SearchResult,
  SearchSource,
} from '@shared/types'

interface ChatContextValue {
  chats: ChatSummary[]
  activeChat: Chat | null
  loadingList: boolean
  loadingChat: boolean
  streaming: boolean
  streamingError: AIErrorPayload | null
  searchQuery: string
  searchResults: SearchResult[] | null
  searching: boolean
  sidebarOpen: boolean
  webSearch: boolean
  deepThink: boolean
  setSidebarOpen: (open: boolean) => void
  setSearchQuery: (q: string) => void
  setWebSearch: (v: boolean) => void
  setDeepThink: (v: boolean) => void
  refreshChats: () => Promise<void>
  newChat: () => Promise<Chat | null>
  selectChat: (id: string) => Promise<void>
  closeChat: () => void
  renameChat: (id: string, title: string) => Promise<void>
  deleteChat: (id: string) => Promise<void>
  importChat: (data: Partial<Chat> & { messages: Message[] }) => Promise<Chat>
  sendMessage: (content: string, attachments: AttachmentMeta[]) => Promise<void>
  stopGeneration: () => void
  regenerate: () => Promise<void>
  continueGeneration: () => Promise<void>
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  clearError: () => void
}

const ChatContext = React.createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { chatSettings, update: updateSettings } = useSettings()
  const [chats, setChats] = React.useState<ChatSummary[]>([])
  const [activeChat, setActiveChat] = React.useState<Chat | null>(null)
  const [loadingList, setLoadingList] = React.useState(true)
  const [loadingChat, setLoadingChat] = React.useState(false)
  const [streaming, setStreaming] = React.useState(false)
  const [streamingError, setStreamingError] = React.useState<AIErrorPayload | null>(null)
  const [searchQuery, setSearchQueryRaw] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<SearchResult[] | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [webSearch, setWebSearchRaw] = React.useState(false)
  const [deepThink, setDeepThinkRaw] = React.useState(false)

  const abortRef = React.useRef<AbortController | null>(null)
  const activeChatRef = React.useRef<Chat | null>(null)
  activeChatRef.current = activeChat
  const webSearchRef = React.useRef(webSearch)
  const deepThinkRef = React.useRef(deepThink)
  webSearchRef.current = webSearch
  deepThinkRef.current = deepThink

  React.useEffect(() => {
    setWebSearchRaw(Boolean(chatSettings.webSearch))
    setDeepThinkRaw(Boolean(chatSettings.deepThink))
  }, [chatSettings.webSearch, chatSettings.deepThink])

  const setWebSearch = React.useCallback(
    (v: boolean) => {
      setWebSearchRaw(v)
      void updateSettings({ chat: { webSearch: v } })
    },
    [updateSettings],
  )

  const setDeepThink = React.useCallback(
    (v: boolean) => {
      setDeepThinkRaw(v)
      void updateSettings({ chat: { deepThink: v } })
    },
    [updateSettings],
  )

  const commitChat = React.useCallback((chat: Chat | null) => {
    activeChatRef.current = chat
    setActiveChat(chat)
  }, [])

  const refreshChats = React.useCallback(async () => {
    try {
      const list = await chatsApi.list()
      setChats(list)
    } finally {
      setLoadingList(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshChats()
  }, [refreshChats])

  const setSearchQuery = React.useCallback((q: string) => {
    setSearchQueryRaw(q)
  }, [])

  React.useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await chatsApi.search(q)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const newChat = React.useCallback(async () => {
    abortRef.current?.abort()
    commitChat(null)
    setStreamingError(null)
    setSidebarOpen(false)
    const chat = await chatsApi.create('New chat')
    commitChat(chat)
    setChats((prev) => [
      {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: 0,
        preview: '',
      },
      ...prev.filter((c) => c.id !== chat.id),
    ])
    return chat
  }, [commitChat])

  const selectChat = React.useCallback(async (id: string) => {
    abortRef.current?.abort()
    setStreamingError(null)
    setSidebarOpen(false)
    setLoadingChat(true)
    try {
      const chat = await chatsApi.get(id)
      setActiveChat(chat)
    } finally {
      setLoadingChat(false)
    }
  }, [])

  const closeChat = React.useCallback(() => {
    abortRef.current?.abort()
    setActiveChat(null)
    setStreamingError(null)
  }, [])

  const renameChat = React.useCallback(async (id: string, title: string) => {
    const updated = await chatsApi.update(id, { title })
    setChats((prev) => prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title, updatedAt: updated.updatedAt } : c)))
    setActiveChat((current) => (current && current.id === updated.id ? { ...current, title: updated.title } : current))
  }, [])

  const deleteChat = React.useCallback(
    async (id: string) => {
      await chatsApi.remove(id)
      setChats((prev) => prev.filter((c) => c.id !== id))
      if (activeChatRef.current?.id === id) {
        abortRef.current?.abort()
        setActiveChat(null)
      }
    },
    [],
  )

  const importChat = React.useCallback(async (data: Partial<Chat> & { messages: Message[] }) => {
    const chat = await chatsApi.import(data)
    await refreshChats()
    setActiveChat(chat)
    return chat
  }, [refreshChats])

  const persist = React.useCallback(async (chat: Chat) => {
    try {
      const updated = await chatsApi.update(chat.id, { messages: chat.messages, title: chat.title })
      setChats((prev) => {
        const summary: ChatSummary = {
          id: updated.id,
          title: updated.title,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          messageCount: updated.messages.length,
          preview: updated.messages[updated.messages.length - 1]?.content.slice(0, 120) ?? '',
        }
        const rest = prev.filter((c) => c.id !== updated.id)
        return [summary, ...rest].sort((a, b) => b.updatedAt - a.updatedAt)
      })
      return updated
    } catch {
      return chat
    }
  }, [])

  const runStream = React.useCallback(
    async (chat: Chat, history: Message[], appendToMessageId: string) => {
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      setStreamingError(null)

      const useSearch = webSearchRef.current
      const useThink = deepThinkRef.current
      let acc = ''
      let reason = ''
      let sources: SearchSource[] | undefined

      const patchAssistant = (patch: Partial<Message>) => {
        setActiveChat((current) => {
          if (!current || current.id !== chat.id) return current
          return {
            ...current,
            messages: current.messages.map((m) => (m.id === appendToMessageId ? { ...m, ...patch } : m)),
          }
        })
      }

      await streamChat(
        history,
        controller.signal,
        {
          onDelta: (text) => {
            acc += text
            patchAssistant({ content: acc })
          },
          onReasoning: (text) => {
            reason += text
            patchAssistant({ reasoning: reason })
          },
          onSources: (hits) => {
            sources = hits
            patchAssistant({ sources: hits })
          },
          onUsage: (usage, model) => {
            patchAssistant({ usage, ...(model ? { model } : {}) })
          },
          onError: (error) => {
            setStreamingError(error)
            setStreaming(false)
            abortRef.current = null
            setActiveChat((current) => {
              if (!current || current.id !== chat.id) return current
              const messages = current.messages.map((m) =>
                m.id === appendToMessageId
                  ? { ...m, content: acc || m.content, error: true, reasoning: reason || m.reasoning }
                  : m,
              )
              if (!acc) {
                return {
                  ...current,
                  messages: messages.map((m) => (m.id === appendToMessageId ? { ...m, content: `⚠ ${error.message}` } : m)),
                }
              }
              return { ...current, messages }
            })
          },
          onDone: () => {
            setStreaming(false)
            abortRef.current = null
            void (async () => {
              const current = activeChatRef.current
              if (current && current.id === chat.id) {
                const withTs = current.messages.map((m) =>
                  m.id === appendToMessageId
                    ? {
                        ...m,
                        timestamp: m.timestamp || Date.now(),
                        reasoning: reason || m.reasoning,
                        usedSearch: useSearch,
                        usedDeepThink: useThink,
                        sources: sources ?? m.sources,
                      }
                    : m,
                )
                const saved = await persist({ ...current, messages: withTs })
                commitChat(saved)
              }
            })()
          },
        },
        { webSearch: useSearch, deepThink: useThink },
      )
    },
    [persist, commitChat],
  )

  const sendMessage = React.useCallback(
    async (content: string, attachments: AttachmentMeta[]) => {
      const trimmed = content.trim()
      if (!trimmed && attachments.length === 0) return
      if (streaming) return

      let chat = activeChatRef.current
      if (!chat) {
        chat = await chatsApi.create(titleFromPrompt(trimmed || 'New chat'))
        commitChat(chat)
        setChats((prev) => [
          {
            id: chat!.id,
            title: chat!.title,
            createdAt: chat!.createdAt,
            updatedAt: chat!.updatedAt,
            messageCount: 0,
            preview: '',
          },
          ...prev,
        ])
      }

      const now = Date.now()
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: now,
        attachments: attachments.length ? attachments : undefined,
      }
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: now,
        usedSearch: webSearchRef.current,
        usedDeepThink: deepThinkRef.current,
      }

      const nextMessages = [...chat.messages, userMsg, assistantMsg]
      const nextChat: Chat = { ...chat, messages: nextMessages }
      commitChat(nextChat)

      const shouldTitle = chat.messages.length === 0 && chat.title === 'New chat' && trimmed
      if (shouldTitle) {
        const title = titleFromPrompt(trimmed)
        nextChat.title = title
        void chatsApi.update(chat.id, { title }).then(() => {
          setChats((prev) => prev.map((c) => (c.id === chat!.id ? { ...c, title } : c)))
        })
      }

      const history = nextMessages.filter((m) => !m.error || m.content)
      const forApi = history.filter((m, i) => !(i === history.length - 1 && m.role === 'assistant' && !m.content))
      await runStream(nextChat, forApi, assistantMsg.id)
    },
    [streaming, runStream, commitChat],
  )

  const stopGeneration = React.useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
    const current = activeChatRef.current
    if (current) void persist(current)
  }, [persist])

  const regenerate = React.useCallback(async () => {
    const chat = activeChatRef.current
    if (!chat || streaming || chat.messages.length === 0) return

    const messages = [...chat.messages]
    while (messages.length && messages[messages.length - 1].role === 'assistant') {
      messages.pop()
    }
    if (!messages.length) return

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      usedSearch: webSearchRef.current,
      usedDeepThink: deepThinkRef.current,
    }
    const nextChat: Chat = { ...chat, messages: [...messages, assistantMsg] }
    commitChat(nextChat)
    await runStream(nextChat, messages, assistantMsg.id)
  }, [streaming, runStream, commitChat])

  const continueGeneration = React.useCallback(async () => {
    const chat = activeChatRef.current
    if (!chat || streaming || !chat.messages.length) return
    const last = chat.messages[chat.messages.length - 1]
    if (last.role !== 'assistant' || !last.content) return

    const history: Message[] = [
      ...chat.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content:
          'Continue your previous response exactly where you left off. Do not repeat any text that was already written. Output only the continuation.',
        timestamp: Date.now(),
      },
    ]
    const appendTo = last.id
    const baseContent = last.content
    const useSearch = webSearchRef.current
    const useThink = deepThinkRef.current
    setStreaming(true)
    setStreamingError(null)
    const controller = new AbortController()
    abortRef.current = controller
    let acc = baseContent
    let reason = last.reasoning ?? ''

    await streamChat(
      history,
      controller.signal,
      {
        onDelta: (text) => {
          acc += text
          setActiveChat((current) => {
            if (!current || current.id !== chat.id) return current
            return {
              ...current,
              messages: current.messages.map((m) => (m.id === appendTo ? { ...m, content: acc } : m)),
            }
          })
        },
        onReasoning: (text) => {
          reason += text
          setActiveChat((current) => {
            if (!current || current.id !== chat.id) return current
            return {
              ...current,
              messages: current.messages.map((m) => (m.id === appendTo ? { ...m, reasoning: reason } : m)),
            }
          })
        },
        onError: (error) => {
          setStreamingError(error)
          setStreaming(false)
        },
        onDone: () => {
          setStreaming(false)
          abortRef.current = null
          setActiveChat((current) => {
            if (!current || current.id !== chat.id) return current
            return {
              ...current,
              messages: current.messages.map((m) =>
                m.id === appendTo
                  ? {
                      ...m,
                      reasoning: reason || m.reasoning,
                      usedSearch: useSearch || m.usedSearch,
                      usedDeepThink: useThink || m.usedDeepThink,
                    }
                  : m,
              ),
            }
          })
          const current = activeChatRef.current
          if (current) {
            void persist({
              ...current,
              messages: current.messages.map((m) =>
                m.id === appendTo
                  ? {
                      ...m,
                      reasoning: reason || m.reasoning,
                      usedSearch: useSearch || m.usedSearch,
                      usedDeepThink: useThink || m.usedDeepThink,
                    }
                  : m,
              ),
            })
          }
        },
      },
      { webSearch: useSearch, deepThink: useThink },
    )
  }, [streaming, persist])

  const editMessage = React.useCallback(
    async (messageId: string, content: string) => {
      const chat = activeChatRef.current
      if (!chat || streaming) return
      const index = chat.messages.findIndex((m) => m.id === messageId)
      if (index === -1) return

      const messages = chat.messages.slice(0, index)
      const edited: Message = {
        ...chat.messages[index],
        content,
        timestamp: Date.now(),
        error: false,
      }
      messages.push(edited)

      if (edited.role === 'user') {
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          usedSearch: webSearchRef.current,
          usedDeepThink: deepThinkRef.current,
        }
        const nextChat: Chat = { ...chat, messages: [...messages, assistantMsg] }
        commitChat(nextChat)
        await runStream(nextChat, messages, assistantMsg.id)
      } else {
        const nextChat: Chat = { ...chat, messages }
        commitChat(nextChat)
        await persist(nextChat)
      }
    },
    [streaming, runStream, persist, commitChat],
  )

  const deleteMessage = React.useCallback(
    async (messageId: string) => {
      const chat = activeChatRef.current
      if (!chat || streaming) return
      const messages = chat.messages.filter((m) => m.id !== messageId)
      const nextChat: Chat = { ...chat, messages }
      commitChat(nextChat)
      await persist(nextChat)
    },
    [streaming, persist, commitChat],
  )

  const clearError = React.useCallback(() => setStreamingError(null), [])

  const value = React.useMemo<ChatContextValue>(
    () => ({
      chats,
      activeChat,
      loadingList,
      loadingChat,
      streaming,
      streamingError,
      searchQuery,
      searchResults,
      searching,
      sidebarOpen,
      webSearch,
      deepThink,
      setSidebarOpen,
      setSearchQuery,
      setWebSearch,
      setDeepThink,
      refreshChats,
      newChat,
      selectChat,
      closeChat,
      renameChat,
      deleteChat,
      importChat,
      sendMessage,
      stopGeneration,
      regenerate,
      continueGeneration,
      editMessage,
      deleteMessage,
      clearError,
    }),
    [
      chats,
      activeChat,
      loadingList,
      loadingChat,
      streaming,
      streamingError,
      searchQuery,
      searchResults,
      searching,
      sidebarOpen,
      webSearch,
      deepThink,
      setSearchQuery,
      setWebSearch,
      setDeepThink,
      refreshChats,
      newChat,
      selectChat,
      closeChat,
      renameChat,
      deleteChat,
      importChat,
      sendMessage,
      stopGeneration,
      regenerate,
      continueGeneration,
      editMessage,
      deleteMessage,
      clearError,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = React.useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
