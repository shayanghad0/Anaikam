import * as React from 'react'
import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ChatHeader } from '@/components/layout/ChatHeader'
import { MessageList, MessageListSkeleton } from '@/components/chat/MessageList'
import { Composer } from '@/components/chat/Composer'
import { WelcomeScreen } from '@/components/chat/WelcomeScreen'
import { ExportDialog } from '@/components/chat/MessageItem'
import { useChat } from '@/contexts/ChatContext'
import type { Chat } from '@shared/types'

export default function ChatPage() {
  const { activeChat, loadingChat, selectChat, streaming } = useChat()
  const { chatId } = useParams<{ chatId: string }>()
  const [exportTarget, setExportTarget] = React.useState<Chat | null>(null)

  React.useEffect(() => {
    if (chatId && activeChat?.id !== chatId && !streaming) {
      void selectChat(chatId)
    }
  }, [chatId, activeChat?.id, selectChat, streaming])

  React.useEffect(() => {
    if (!activeChat) return
    const path = `/c/${activeChat.id}`
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path)
    }
  }, [activeChat?.id])

  const showWelcome = !activeChat || (activeChat.messages.length === 0 && !loadingChat)

  return (
    <AppShell>
      <ChatHeader onOpenExport={setExportTarget} />
      <div className="flex min-h-0 flex-1 flex-col">
        {loadingChat && !activeChat && chatId ? (
          <MessageListSkeleton />
        ) : showWelcome ? (
          <WelcomeScreen />
        ) : activeChat ? (
          <MessageList key={activeChat.id} chat={activeChat} />
        ) : null}
        <Composer />
      </div>
      {exportTarget ? (
        <ExportDialog chat={exportTarget} open onOpenChange={(o) => !o && setExportTarget(null)} />
      ) : null}
    </AppShell>
  )
}
