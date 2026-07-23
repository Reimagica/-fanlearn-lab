'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, ChevronLeft, FileText, Loader2, Paperclip, RotateCcw, Send, Sparkles, User, X } from 'lucide-react'
import type { ChatStructuredResponse } from '@/types'

const SUGGESTIONS = [
  '课题组有哪些研究方向？',
  '如何提交一篇论文？',
  '请介绍一下课题组成员',
  '最近有哪些新论文发表？',
]

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  structured?: ChatStructuredResponse
}

interface AttachmentDraft {
  name: string
  type: string
  size: number
  content: string
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [fileError, setFileError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasMessages = messages.length > 0

  const scrollToBottom = useCallback(() => {
    const el = bottomRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => {
    if (hasMessages) scrollToBottom()
  }, [messages.length, scrollToBottom, hasMessages])

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    setFileError('')
    const selected = Array.from(files).slice(0, 5)
    const next = await Promise.all(selected.map(async (file) => {
      if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} 超过 5MB`)
      const textLike = file.type.startsWith('text/') || /\.(md|txt|csv|json|bib)$/i.test(file.name)
      return {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        content: textLike ? (await file.text()).slice(0, 12_000) : '',
      }
    })).catch((error: Error) => {
      setFileError(error.message)
      return []
    })
    setAttachments((current) => [...current, ...next].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const appendAssistantMessage = (payload: { content: string; structured?: ChatStructuredResponse }) => {
    setMessages((current) => [
      ...current,
      {
        id: `assistant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: payload.content,
        structured: payload.structured,
      },
    ])
  }

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if ((input.trim().length === 0 && attachments.length === 0) || isLoading) return

    const userContent = input.trim() || '（仅附件，无文本问题）'
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: userContent,
      },
    ]

    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          attachments,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'AI 服务暂时不可用，请稍后重试')
      }

      appendAssistantMessage({
        content: data.answer || '我暂时没有生成有效回答。',
        structured: {
          answer: data.answer || '',
          sources: data.sources ?? [],
          uncertainty: data.uncertainty ?? { level: 'high', notes: ['返回结果缺少不确定性说明。'] },
          nextStep: data.nextStep || '如果你愿意，我可以继续帮你梳理下一步。',
        },
      })
      setAttachments([])
    } catch (error) {
      appendAssistantMessage({
        content: error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const form = event.currentTarget.form
      form?.requestSubmit()
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-0.5 text-xs text-text-muted transition-colors hover:text-text"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-text-strong">AI 助手</h1>
                <p className="text-[11px] text-text-faint">结构化回答 / 来源 / 不确定性 / 下一步</p>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              <RotateCcw size={12} /> 清空
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-12 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
                <Sparkles size={28} className="text-indigo-400" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-text-strong">你好！我是课题组 AI 助手</h2>
              <p className="mb-8 max-w-md text-sm text-text-muted">
                我会先检索本站已有事实，再给你结构化回答。<br />
                如果信息不够，我会明确告诉你哪里还需要确认。
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                      inputRef.current?.focus()
                    }}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-xs text-text-muted transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-text-strong"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                    message.role === 'user'
                      ? 'bg-indigo-500/20 ring-1 ring-indigo-500/30'
                      : 'bg-surface-2 ring-1 ring-border'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User size={13} className="text-indigo-400" />
                  ) : (
                    <Bot size={13} className="text-text-muted" />
                  )}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-tr-sm bg-indigo-600 text-white'
                      : 'rounded-tl-sm bg-surface text-text-strong ring-1 ring-border'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.role === 'assistant' && message.structured && (
                    <div className="mt-4 space-y-3 border-t border-border/70 pt-3 text-xs">
                      <div>
                        <p className="mb-1 text-text-muted">来源</p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.structured.sources.length > 0 ? message.structured.sources.map((source) => (
                            <a
                              key={`${source.kind}-${source.title}-${source.url ?? ''}`}
                              href={source.url}
                              target={source.url ? '_blank' : undefined}
                              rel={source.url ? 'noreferrer' : undefined}
                              className="rounded-full bg-surface-2 px-2 py-1 text-[11px] text-text-muted transition-colors hover:text-indigo-400"
                            >
                              {source.title}
                            </a>
                          )) : <span className="text-text-faint">暂无可直接引用的站内来源</span>}
                        </div>
                      </div>

                      <div className="rounded-xl bg-surface-2 p-3">
                        <p className="mb-1 text-text-muted">
                          不确定性：{message.structured.uncertainty.level}
                        </p>
                        <ul className="space-y-1 text-text-muted">
                          {message.structured.uncertainty.notes.map((note, index) => (
                            <li key={`${message.id}-note-${index}`}>• {note}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-text-muted">
                        <span className="text-[11px] font-medium text-indigo-400">下一步：</span>
                        <span className="ml-1 text-[11px]">{message.structured.nextStep}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 ring-1 ring-white/10">
                <Bot size={13} className="text-text-muted" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-surface px-4 py-3 ring-1 ring-border">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span className="text-xs text-text-muted">正在生成结构化回答...</span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
        <form onSubmit={handleSend} className="mx-auto max-w-3xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-muted"
                >
                  <FileText size={12} /> {file.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                    className="ml-1 hover:text-red-400"
                    aria-label={`移除${file.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {fileError && <p className="mb-2 text-xs text-red-400">{fileError}</p>}

          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.bib"
              onChange={(event) => handleFiles(event.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-muted hover:border-indigo-500/30 hover:text-indigo-400"
              aria-label="上传参考文件"
            >
              <Paperclip size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，或上传参考文件…（Enter 发送，Shift+Enter 换行）"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-strong outline-none placeholder:text-text-faint transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-xs text-text-faint">
          AI 可能会出错，重要信息请人工核实
        </p>
      </div>
    </div>
  )
}
