'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Mic, Users } from 'lucide-react'
import type { Publication, NewsItem, NewsCategory } from '@/types'
import PublicationCard from '@/components/publications/PublicationCard'

const NEWS_ICON: Record<NewsCategory, React.ElementType> = {
  paper: FileText,
  academic: Mic,
  member: Users,
}

const NEWS_LABEL: Record<NewsCategory, string> = {
  paper: '论文发表',
  academic: '学术动态',
  member: '成员动态',
}

interface MemberTabsProps {
  papers: Publication[]
  news: NewsItem[]
}

const TABS = [
  { key: 'papers', label: '发表文章' },
  { key: 'news', label: '科研动态' },
]

export default function MemberTabs({ papers, news }: MemberTabsProps) {
  const [tab, setTab] = useState<'papers' | 'news'>('papers')

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as 'papers' | 'news')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              tab === key
                ? 'bg-indigo-500 text-white shadow'
                : 'text-text-muted hover:text-text-strong'
            }`}
          >
            {label}
            <span className={`ml-1.5 rounded-full px-1.5 text-xs ${
              tab === key ? 'bg-hairline-strong' : 'bg-surface-2'
            }`}>
              {key === 'papers' ? papers.length : news.length}
            </span>
          </button>
        ))}
      </div>

      {/* Papers tab */}
      {tab === 'papers' && (
        <div className="space-y-3">
          {papers.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">暂无发表文章</p>
          )}
          {[...papers].sort((a, b) => b.year - a.year).map((paper) => <PublicationCard key={paper.id} paper={paper} />)}
        </div>
      )}

      {/* News tab */}
      {tab === 'news' && (
        <div className="space-y-3">
          {news.length === 0 && (
            <p className="py-8 text-center text-sm text-text-muted">暂无科研动态</p>
          )}
          {news
            .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
            .map((item) => {
              const Icon = NEWS_ICON[item.category]
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-indigo-500/20"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-400 ring-1 ring-cyan-500/20">
                      <Icon size={11} />
                      {NEWS_LABEL[item.category]}
                    </span>
                    <time className="text-xs text-text-faint">
                      {new Date(item.eventDate).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <Link href={`/news/${encodeURIComponent(item.id)}`} className="font-medium text-text-strong hover:text-indigo-400">{item.title}</Link>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{item.summary}</p>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
