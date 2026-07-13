'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ExternalLink, FileText, User } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import { useLabData } from '@/lib/lab-data'

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>()
  const { news, members } = useLabData()
  const item = news.find((current) => current.id === decodeURIComponent(params.id))
  if (!item) return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><p className="text-text-muted">未找到该动态，它可能尚未通过审核。</p><Link href="/news" className="mt-4 inline-block text-indigo-400">返回动态列表</Link></div>
  const relatedSlugs = Array.from(new Set([
    ...(item.relatedMemberSlugs ?? []),
    ...(item.memberSlug ? [item.memberSlug] : []),
  ]))
  const relatedMembers = relatedSlugs
    .map((slug) => members.find((member) => member.slug === slug))
    .filter((member) => member !== undefined)
  return (
    <div className="min-h-screen pb-20 pt-24"><article className="mx-auto max-w-3xl px-4 sm:px-6"><div className="mb-6"><BackButton href="/news" label="课题组动态" /></div><header className="border-b border-border pb-8"><div className="mb-4 flex flex-wrap gap-4 text-xs text-text-muted"><span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(item.eventDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span><span className="flex items-center gap-1.5"><User size={13} /> {item.authorName || '课题组'}</span></div><h1 className="text-3xl font-bold leading-tight text-text-strong sm:text-4xl">{item.title}</h1><p className="mt-5 border-l-2 border-indigo-500 pl-4 text-base leading-7 text-text-muted">{item.summary}</p></header><div className="space-y-5 py-8 text-base leading-8 text-text">{(item.content ?? '').split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{relatedMembers.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-text-muted"><span>本条动态关联成员：</span>{relatedMembers.map((member) => <Link key={member.slug} href={`/team/${member.slug}`} className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-indigo-400">{member.name}</Link>)}</div>}{((item.referenceLinks?.length ?? 0) > 0 || (item.attachments?.length ?? 0) > 0) && <footer className="mt-8 border-t border-border pt-6"><h2 className="mb-3 text-sm font-semibold text-text-strong">参考资料</h2><div className="space-y-2">{item.referenceLinks?.map((link) => <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 break-all text-xs text-indigo-400"><ExternalLink size={12} className="mt-0.5 shrink-0" /> {link}</a>)}{item.attachments?.map((file) => <p key={file.name} className="flex items-center gap-2 text-xs text-text-muted"><FileText size={12} /> {file.name}</p>)}</div></footer>}</article></div>
  )
}
