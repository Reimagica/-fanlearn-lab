'use client'

import { useChat } from 'ai/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, Sparkles, RotateCcw, ChevronLeft, Paperclip, FileText, X } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

const SUGGESTIONS = [
  '课题组有哪些研究方向？',
  '如何提交一篇论文？',
  '请介绍一下课题组成员',
  '最近有哪些新论文发表？',
]

export default function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; size: number; content: string }>>([])
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (event: { preventDefault?: () => void }) => {
    event.preventDefault?.()
    if ((!input.trim() && attachments.length === 0) || isLoading) return
    handleSubmit(event, { body: { attachments }, allowEmptySubmit: attachments.length > 0 })
    setAttachments([])
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    setFileError('')
    const selected = Array.from(files).slice(0, 5)
    const next = await Promise.all(selected.map(async (file) => {
      if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} 超过 5MB`)
      const textLike = file.type.startsWith('text/') || /\.(md|txt|csv|json|bib)$/i.test(file.name)
      return { name: file.name, type: file.type || 'application/octet-stream', size: file.size, content: textLike ? (await file.text()).slice(0, 12000) : '' }
    })).catch((error: Error) => {
      setFileError(error.message)
      return []
    })
    setAttachments((current) => [...current, ...next].slice(0, 5))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((input.trim() || attachments.length > 0) && !isLoading) {
        handleSend(e)
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col pt-16">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back button */}
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
                <h1 className="text-sm font-semibold text-text-strong">LabMind AI 助手</h1>
                <p className="text-xs text-text-muted">回答问题 · 检索信息 · 指引内容提交</p>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
            >
              <RotateCcw size={12} /> 清空
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Empty state */}
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
                我可以回答课题组相关问题，并指引你提交论文或动态。<br />
                正式提交需由成员登录后在对应页面确认。
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      handleInputChange({ target: { value: s } } as React.ChangeEvent<HTMLTextAreaElement>)
                      inputRef.current?.focus()
                    }}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-xs text-text-muted transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-text-strong"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                    message.role === 'user'
                      ? 'bg-indigo-500/20 ring-1 ring-indigo-500/30'
                      : 'bg-surface-2 ring-1 ring-white/10'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User size={13} className="text-indigo-400" />
                  ) : (
                    <Bot size={13} className="text-text-muted" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-tr-sm bg-indigo-600 text-white'
                      : 'rounded-tl-sm bg-surface text-text-strong ring-1 ring-border'
                  }`}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
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
                <span className="text-xs text-text-muted">正在思考...</span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
        <form onSubmit={handleSend} className="mx-auto max-w-3xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <span key={`${file.name}-${index}`} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-muted"><FileText size={12} /> {file.name}<button type="button" onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="ml-1 hover:text-red-400" aria-label={`移除${file.name}`}><X size={12} /></button></span>
              ))}
            </div>
          )}
          {fileError && <p className="mb-2 text-xs text-red-400">{fileError}</p>}
          <div className="flex gap-3">
          <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.json,.bib" onChange={(event) => handleFiles(event.target.files)} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-muted hover:border-indigo-500/30 hover:text-indigo-400" aria-label="上传参考文件"><Paperclip size={16} /></button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，或上传参考文件…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-strong placeholder-slate-600 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
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
