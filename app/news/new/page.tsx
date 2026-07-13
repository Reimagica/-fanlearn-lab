'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, FilePlus2, Loader2, Paperclip, Send, Sparkles, X } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from '@/lib/news-category'
import type { NewsCategory, NewsItem } from '@/types'

interface Draft {
  title: string
  summary: string
  content: string
}

interface AttachmentDraft {
  name: string
  type: string
  size: number
  content: string
}

export default function NewNewsPage() {
  const { user } = useAuth()
  const { submitNews } = useLabData()
  const [category, setCategory] = useState<NewsCategory>('academic')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [instructions, setInstructions] = useState('')
  const [referenceText, setReferenceText] = useState('')
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [draft, setDraft] = useState<Draft>({ title: '', summary: '', content: '' })
  const [revisionRequest, setRevisionRequest] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [message, setMessage] = useState('')

  if (!user) {
    return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><p className="text-text-muted">只有课题组成员可发布动态。</p><Link href="/login?from=/news/new" className="mt-4 inline-block text-indigo-400">前往登录</Link></div>
  }

  const referenceLinks = referenceText.split(/\n|,/).map((item) => item.trim()).filter(Boolean)

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const selected = Array.from(files).slice(0, 5)
    const oversized = selected.find((file) => file.size > 5 * 1024 * 1024)
    if (oversized) {
      setMessage(`${oversized.name} 超过 5MB，请压缩后重试`)
      return
    }
    const next = await Promise.all(selected.map(async (file) => ({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      content: (file.type.startsWith('text/') || /\.(md|txt|csv|json)$/i.test(file.name)) ? (await file.text()).slice(0, 10000) : '',
    })))
    setAttachments((current) => [...current, ...next].slice(0, 5))
  }

  const generate = async (revise = false) => {
    if (!revise && !instructions.trim()) {
      setMessage('请先用自然语言描述事件与写作要求')
      return
    }
    if (revise && !revisionRequest.trim()) {
      setMessage('请填写修改意见')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, instructions, referenceLinks, attachments, currentContent: revise ? draft : undefined, revisionRequest: revise ? revisionRequest : undefined }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI 生成失败')
      setDraft({ title: data.title, summary: data.summary, content: data.content })
      setRevisionRequest('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI 生成失败')
    } finally {
      setLoading(false)
    }
  }

  const submit = () => {
    if (!draft.title.trim() || !draft.summary.trim() || !draft.content.trim()) {
      setMessage('请先完成标题、摘要和正文')
      return
    }
    const item: NewsItem = {
      id: `news_${Date.now()}`,
      ...draft,
      category,
      memberSlug: user.memberSlug,
      relatedMemberSlugs: [user.memberSlug],
      authorName: user.name,
      eventDate,
      referenceLinks,
      attachments: attachments.map(({ name, type, size }) => ({ name, type, size })),
      status: 'pending_review',
      source: 'agent',
      createdAt: new Date().toISOString(),
    }
    const result = submitNews(item, { slug: user.memberSlug, name: user.name })
    setPreviewOpen(false)
    setMessage(result.ok ? '已提交管理员审核，审核通过后将正式发布' : result.error ?? '提交失败')
  }

  const inputClass = 'w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50'

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-6"><BackButton href="/news" label="课题组动态" /></div>
        <div className="mb-8"><h1 className="text-3xl font-bold text-text-strong">发布动态</h1><p className="mt-2 text-sm text-text-muted">提供事实材料和写作要求，由 DeepSeek 起草，你可直接编辑或继续让 AI 修改。</p></div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-5 flex items-center gap-2 font-semibold text-text-strong"><FilePlus2 size={17} className="text-indigo-400" /> 1. 提供发布要求</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-text-muted">动态类型<select value={category} onChange={(event) => setCategory(event.target.value as NewsCategory)} className={`mt-1.5 ${inputClass}`}>{NEWS_CATEGORIES.map((key) => <option key={key} value={key}>{NEWS_CATEGORY_LABELS[key]}</option>)}</select></label>
              <label className="text-xs text-text-muted">事件日期<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className={`mt-1.5 ${inputClass}`} /></label>
              <label className="text-xs text-text-muted sm:col-span-2">参考链接<textarea value={referenceText} onChange={(event) => setReferenceText(event.target.value)} rows={2} placeholder="每行一个链接" className={`mt-1.5 resize-none ${inputClass}`} /></label>
              <div className="sm:col-span-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-text hover:border-indigo-500/30"><Paperclip size={14} /> 添加参考文件<input type="file" multiple accept=".txt,.md,.csv,.json" onChange={(event) => addFiles(event.target.files)} className="hidden" /></label><p className="mt-2 text-xs text-text-faint">当前支持 TXT、Markdown、CSV、JSON 文本文件，单个不超过 5MB；PDF/Word 将在接入文件存储与解析后开放。</p>{attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{attachments.map((file, index) => <span key={`${file.name}-${index}`} className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-text-muted">{file.name}<button onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="hover:text-red-400"><X size={11} /></button></span>)}</div>}</div>
              <label className="text-xs text-text-muted sm:col-span-2">用自然语言说明事件与写作要求<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={5} placeholder="例：请撰写一条学术动态。范老师于……参与了……，语气专业、简洁，不要夸大。" className={`mt-1.5 resize-none ${inputClass}`} /></label>
            </div>
            <button onClick={() => generate(false)} disabled={loading} className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI 生成草稿</button>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-5 font-semibold text-text-strong">2. 编辑统一结构的草稿</h2>
            <div className="space-y-4">
              <label className="block text-xs text-text-muted">标题<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`mt-1.5 ${inputClass}`} /></label>
              <label className="block text-xs text-text-muted">列表摘要<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} rows={2} className={`mt-1.5 resize-none ${inputClass}`} /></label>
              <label className="block text-xs text-text-muted">正文<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} rows={10} className={`mt-1.5 resize-y ${inputClass}`} /></label>
              <div className="rounded-xl bg-surface-2 p-4"><label className="block text-xs text-text-muted">AI 修改意见<textarea value={revisionRequest} onChange={(event) => setRevisionRequest(event.target.value)} rows={2} placeholder="例：第二段更简洁，并强调对学习分析研究的意义" className={`mt-1.5 resize-none ${inputClass}`} /></label><button onClick={() => generate(true)} disabled={loading || !draft.content} className="mt-3 flex items-center gap-1.5 rounded-lg border border-indigo-500/30 px-3 py-2 text-xs text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-40"><Sparkles size={13} /> 让 AI 按意见修改</button></div>
            </div>
          </section>

          {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.includes('已提交') ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{message}</p>}
          <div className="flex justify-end"><button onClick={() => setPreviewOpen(true)} disabled={!draft.title || !draft.content} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"><Eye size={15} /> 预览并提交</button></div>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between"><div><span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-400">{NEWS_CATEGORY_LABELS[category]}</span><p className="mt-2 text-xs text-text-muted">{eventDate} · 作者 {user.name}</p></div><button onClick={() => setPreviewOpen(false)} className="p-2 text-text-muted"><X size={18} /></button></div>
            <h1 className="text-3xl font-bold leading-tight text-text-strong">{draft.title}</h1><p className="mt-4 border-l-2 border-indigo-500 pl-4 text-sm leading-7 text-text-muted">{draft.summary}</p><div className="mt-8 space-y-4 text-sm leading-8 text-text">{draft.content.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            {referenceLinks.length > 0 && <div className="mt-8 border-t border-border pt-5"><p className="mb-2 text-xs font-medium text-text-muted">参考链接</p>{referenceLinks.map((link) => <p key={link} className="break-all text-xs text-indigo-400">{link}</p>)}</div>}
            <div className="mt-8 flex justify-end gap-3"><button onClick={() => setPreviewOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted">返回修改</button><button onClick={submit} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><Send size={14} /> 提交管理员审核</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
