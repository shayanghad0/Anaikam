import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useChat } from '@/contexts/ChatContext'
import { useSettings } from '@/contexts/SettingsContext'
import { MessageItem } from '@/components/chat/MessageItem'
import { ErrorCard } from '@/components/chat/ErrorCard'
import { useNavigate } from 'react-router-dom'
import type { Chat } from '@shared/types'

export function MessageList({ chat }: { chat: Chat }) {
  const { streaming, streamingError, regenerate, continueGeneration, editMessage, deleteMessage, clearError } = useChat()
  const { chatSettings } = useSettings()
  const navigate = useNavigate()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const lastMessageId = chat.messages[chat.messages.length - 1]?.id
  const isStreamingFinal =
    streaming && lastMessageId !== undefined && chat.messages[chat.messages.length - 1]?.role === 'assistant'

  const rowVirtualizer = useVirtualizer({
    count: chat.messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 4,
    getItemKey: (index) => chat.messages[index]?.id ?? index,
  })

  React.useEffect(() => {
    if (!chatSettings.autoScroll) return
    if (!streaming && chat.messages.length === 0) return
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: streaming ? 'auto' : 'smooth' })
    })
  }, [chat.messages, streaming, chatSettings.autoScroll, chat.id])

  React.useEffect(() => {
    if (!streaming) return
    const el = scrollRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
    return () => cancelAnimationFrame(id)
  }, [chat.messages[chat.messages.length - 1]?.content, streaming])

  const lastAssistantId = [...chat.messages].reverse().find((m) => m.role === 'assistant')?.id

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scrollbar-thin overscroll-contain"
      role="log"
      aria-label="Conversation"
    >
      <div
        className="mx-auto w-full px-4 py-4"
        style={{ maxWidth: 'var(--chat-width)' }}
      >
        <div
          className="relative w-full"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {rowVirtualizer.getVirtualItems().map((row) => {
            const message = chat.messages[row.index]
            if (!message) return null
            return (
              <div
                key={row.key}
                data-index={row.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${row.start}px)` }}
              >
                <MessageItem
                  message={message}
                  chat={chat}
                  isStreamingFinal={isStreamingFinal && message.id === lastMessageId}
                  onRegenerate={regenerate}
                  onContinue={continueGeneration}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  canContinue={message.id === lastAssistantId && Boolean(message.content)}
                />
              </div>
            )
          })}
        </div>

        {streamingError ? (
          <div className="mx-auto w-full" style={{ maxWidth: 'var(--chat-width)' }}>
            <ErrorCard
              error={streamingError}
              onRetry={() => {
                clearError()
                void regenerate()
              }}
              onOpenSettings={() => navigate('/settings')}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={i % 2 === 0 ? 'self-end' : 'self-start'}>
            <div className={`skeleton h-12 ${i % 2 === 0 ? 'w-64' : 'w-full max-w-xl'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
