'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Calendar, Download, ExternalLink, FileText, Quote, Users } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import PublicationCard from '@/components/publications/PublicationCard'
import { useLabData } from '@/lib/lab-data'

export default function PublicationDetailPage() {
  const params = useParams<{ id: string }>()
  const { publications, members } = useLabData()
  const id = decodeURIComponent(params.id)
  const paper = publications.find((item) => item.id === id)

  if (!paper) {
    return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><p className="text-text-muted">未找到该论文，它可能尚未通过审核。</p><Link href="/publications" className="mt-4 inline-block text-indigo-400">返回论文列表</Link></div>
  }

  const relatedMembers = members.filter((member) => paper.relatedMemberSlugs.includes(member.slug))

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6"><BackButton href="/publications" label="学术成果" /></div>
        <div className="mb-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-text-muted">
            <span className="flex items-center gap-1"><BookOpen size={13} /> {paper.venue}</span>
            <span className="flex items-center gap-1"><Calendar size={13} /> {paper.year}</span>
            <span className="flex items-center gap-1"><Quote size={13} /> {paper.citationCount} 引用</span>
            <span className="flex items-center gap-1"><Download size={13} /> {paper.downloadCount || 0} 下载</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-text-strong sm:text-4xl">{paper.title}</h1>
          <p className="mt-4 flex items-start gap-2 text-sm leading-7 text-text-muted"><Users size={15} className="mt-1.5 shrink-0" /> {paper.authors.join(', ')}</p>
          {relatedMembers.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-faint">本组成员</span>
              {relatedMembers.map((member) => <Link key={member.slug} href={`/team/${member.slug}`} className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-400 hover:bg-indigo-500/20">{member.name}</Link>)}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {paper.arxivId && <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"><ExternalLink size={13} /> arXiv</a>}
            {paper.pdfUrl && <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-text hover:border-indigo-500/30"><FileText size={13} /> PDF</a>}
            {paper.doi && <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-text hover:border-indigo-500/30"><ExternalLink size={13} /> DOI</a>}
            {paper.sourceUrl && paper.sourceUrl !== paper.pdfUrl && paper.sourceUrl !== `https://doi.org/${paper.doi}` && <a href={paper.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-text hover:border-indigo-500/30"><ExternalLink size={13} /> 原文页面</a>}
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">摘要</h2>
          <p className="text-sm leading-7 text-text">{paper.abstract || '暂无摘要'}</p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">快速操作</h2>
          <PublicationCard paper={paper} />
        </section>
      </div>
    </div>
  )
}
