'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileText, Mic, Plus, Search, Users, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import type { NewsCategory } from '@/types'

const CATEGORY_CONFIG: Record<NewsCategory, { icon: React.ElementType; color: string; label: string }> = {
  paper: { icon: FileText, color: 'ring-indigo-500/30 bg-indigo-500/10 text-indigo-400', label: '论文发表' },
  academic: { icon: Mic, color: 'ring-cyan-500/30 bg-cyan-500/10 text-cyan-400', label: '学术动态' },
  member: { icon: Users, color: 'ring-green-500/30 bg-green-500/10 text-green-400', label: '成员动态' },
}

type TabKey = 'all' | NewsCategory
const TABS: Array<{ key: TabKey; label: string }> = [{ key: 'all', label: '全部' }, { key: 'paper', label: '论文发表' }, { key: 'academic', label: '学术动态' }, { key: 'member', label: '成员动态' }]

export default function NewsPage() {
  const { user } = useAuth()
  const { news, reviews } = useLabData()
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => news.filter((item) => {
    if (tab !== 'all' && item.category !== tab) return false
    const target = `${item.title} ${item.summary} ${item.content ?? ''}`.toLowerCase()
    return !query.trim() || target.includes(query.trim().toLowerCase())
  }).sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()), [news, query, tab])
  const myPending = user ? reviews.filter((item) => item.contentType === 'news' && item.submittedBy === user.memberSlug && item.humanReviewStatus === 'pending').length : 0

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="mb-2 text-4xl font-bold text-text-strong sm:text-5xl">课题组动态</h1><p className="text-text-muted">记录学术成果、活动与成员成长</p></div>
          {user && <Link href="/news/new" className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><Plus size={15} /> 发布动态</Link>}
        </motion.div>
        {myPending > 0 && <p className="mb-5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">你有 {myPending} 条动态正在等待管理员审核。</p>}

        <div className="relative mb-5"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索动态标题或内容…" className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" />{query && <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"><X size={14} /></button>}</div>
        <div className="mb-8 inline-flex w-full overflow-x-auto rounded-xl border border-border bg-surface p-1">{TABS.map(({ key, label }) => <button key={key} onClick={() => setTab(key)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${tab === key ? 'bg-indigo-500 text-white shadow' : 'text-text-muted hover:text-text-strong'}`}>{label}</button>)}</div>

        <div className="relative"><div className="absolute left-5 top-0 h-full w-px bg-surface-2" /><div className="space-y-6">
          {filtered.map((item, index) => {
            const config = CATEGORY_CONFIG[item.category]
            const Icon = config.icon
            return <motion.article key={item.id} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index * 0.05, 0.25) }} className="relative pl-14"><div className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full ring-1 ${config.color}`}><Icon size={16} /></div><Link href={`/news/${encodeURIComponent(item.id)}`} className="group block rounded-xl border border-border bg-surface p-5 hover:border-indigo-500/25"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${config.color}`}>{config.label}</span><time className="text-xs text-text-muted">{new Date(item.eventDate).toLocaleDateString('zh-CN')}</time></div><h2 className="font-medium text-text-strong group-hover:text-indigo-400">{item.title}</h2><p className="mt-2 text-sm leading-6 text-text-muted">{item.summary}</p><p className="mt-3 text-xs text-text-faint">发布者：{item.authorName || '课题组'}</p></Link></motion.article>
          })}
          {filtered.length === 0 && <p className="py-12 text-center text-sm text-text-muted">暂无相关动态</p>}
        </div></div>
      </div>
    </div>
  )
}
