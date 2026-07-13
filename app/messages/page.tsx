'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock3, Eye, FileText, Newspaper, ShieldCheck, XCircle } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import type { NewsItem, Publication, ReviewQueueItem } from '@/types'

function ReviewPreview({ review }: { review: ReviewQueueItem }) {
  if (review.contentType === 'publication') {
    const paper = review.content as Publication
    return <div className="space-y-3"><h3 className="text-lg font-semibold text-text-strong">{paper.title}</h3><p className="text-sm text-text-muted">{paper.authors.join(', ')}</p><div className="flex flex-wrap gap-2 text-xs text-text-muted"><span>{paper.venue}</span><span>{paper.year}</span>{paper.doi && <span>DOI: {paper.doi}</span>}</div><p className="rounded-xl bg-surface-2 p-4 text-sm leading-7 text-text">{paper.abstract || '无摘要'}</p><p className="text-xs text-text-muted">将同步至成员：{paper.relatedMemberSlugs.join('、')}</p></div>
  }
  const item = review.content as NewsItem
  return <div className="space-y-3"><h3 className="text-xl font-semibold text-text-strong">{item.title}</h3><p className="border-l-2 border-indigo-500 pl-3 text-sm leading-6 text-text-muted">{item.summary}</p><div className="space-y-3 text-sm leading-7 text-text">{(item.content ?? '').split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{item.referenceLinks && item.referenceLinks.length > 0 && <div className="rounded-xl bg-surface-2 p-3 text-xs text-text-muted">参考链接：{item.referenceLinks.join('、')}</div>}</div>
}

export default function MessagesPage() {
  const { user } = useAuth()
  const { reviews, approveReview, rejectReview } = useLabData()
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  if (!user) return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><p className="text-text-muted">请先登录。</p><Link href="/login?from=/messages" className="mt-4 inline-block text-indigo-400">前往登录</Link></div>
  if (!user.isAdmin) return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><ShieldCheck size={28} className="mx-auto mb-3 text-text-muted" /><p className="text-text-muted">此页面仅对拥有管理员权限的成员开放。</p></div>

  const visible = reviews.filter((review) => tab === 'pending' ? review.humanReviewStatus === 'pending' : review.humanReviewStatus !== 'pending')
  const current = reviews.find((review) => review.id === selected)

  const approve = () => {
    if (!current) return
    approveReview(current.id, user.memberSlug, note)
    setSelected(null)
    setNote('')
  }
  const reject = () => {
    if (!current || !note.trim()) return
    rejectReview(current.id, user.memberSlug, note)
    setSelected(null)
    setNote('')
  }

  return (
    <div className="min-h-screen pb-20 pt-24"><div className="mx-auto max-w-5xl px-4 sm:px-6"><div className="mb-6"><BackButton label="返回" /></div><div className="mb-8"><h1 className="flex items-center gap-2 text-3xl font-bold text-text-strong"><ShieldCheck className="text-indigo-400" /> 消息与内容审核</h1><p className="mt-2 text-sm text-text-muted">论文和动态只有在管理员预览并通过后才会公开发布。</p></div>
      <div className="mb-6 inline-flex rounded-xl border border-border bg-surface p-1"><button onClick={() => setTab('pending')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'pending' ? 'bg-indigo-500 text-white' : 'text-text-muted'}`}>待处理 {reviews.filter((item) => item.humanReviewStatus === 'pending').length}</button><button onClick={() => setTab('history')} className={`rounded-lg px-4 py-2 text-sm ${tab === 'history' ? 'bg-indigo-500 text-white' : 'text-text-muted'}`}>审核记录</button></div>
      <div className="space-y-3">{visible.map((review) => <article key={review.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${review.contentType === 'publication' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{review.contentType === 'publication' ? <FileText size={17} /> : <Newspaper size={17} />}</div><div className="min-w-0 flex-1"><p className="truncate font-medium text-text-strong">{review.content.title}</p><p className="mt-1 flex items-center gap-2 text-xs text-text-muted"><span>提交人：{review.submitterName}</span><Clock3 size={11} /> {new Date(review.createdAt).toLocaleString('zh-CN')}</p>{review.reviewNote && <p className="mt-2 text-xs text-text-muted">审核意见：{review.reviewNote}</p>}</div>{review.humanReviewStatus === 'pending' ? <button onClick={() => setSelected(review.id)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-text hover:border-indigo-500/30 hover:text-indigo-400"><Eye size={13} /> 预览审核</button> : <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${review.humanReviewStatus === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{review.humanReviewStatus === 'approved' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{review.humanReviewStatus === 'approved' ? '已通过' : '已驳回'}</span>}</article>)}{visible.length === 0 && <p className="py-16 text-center text-sm text-text-muted">暂无内容</p>}</div></div>
      {current && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm" onClick={() => setSelected(null)}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-400">{current.contentType === 'publication' ? '论文审核' : '动态审核'}</span><p className="mt-2 text-xs text-text-muted">提交人：{current.submitterName}</p></div><button onClick={() => setSelected(null)} className="text-text-muted"><XCircle size={18} /></button></div><ReviewPreview review={current} /><label className="mt-6 block text-xs text-text-muted">审核意见<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="通过时可选；驳回时必填，说明需要修改的内容" className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 text-sm text-text-strong outline-none focus:border-indigo-500/50" /></label><div className="mt-5 flex justify-end gap-3"><button onClick={reject} disabled={!note.trim()} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-40"><XCircle size={14} /> 驳回</button><button onClick={approve} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"><CheckCircle2 size={14} /> 通过并发布</button></div></div></div>}
    </div>
  )
}
