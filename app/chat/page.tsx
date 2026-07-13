import ChatPanel from '@/components/chat/ChatPanel'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI 助手',
  description: '与 FanLearn Lab AI 助手对话',
}

export default function ChatPage() {
  return <ChatPanel />
}
