'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, Mic, Users, ArrowRight } from 'lucide-react'
import { useLabData } from '@/lib/lab-data'
import type { NewsCategory } from '@/types'

const CATEGORY_CONFIG: Record<NewsCategory, { icon: React.ElementType; color: string; label: string }> = {
  paper: { icon: FileText, color: 'text-indigo-400 bg-indigo-400/10', label: '论文发表' },
  academic: { icon: Mic, color: 'text-cyan-400 bg-cyan-400/10', label: '学术动态' },
  member: { icon: Users, color: 'text-green-400 bg-green-400/10', label: '成员动态' },
}

export default function LatestNews() {
  const { news } = useLabData()
  const latest = [...news].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()).slice(0, 3)

  return (
    <section className="py-20 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex items-end justify-between"
        >
          <h2 className="text-3xl font-bold text-text-strong sm:text-4xl">课题组动态</h2>
          <Link href="/news" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            查看全部 <ArrowRight size={14} />
          </Link>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          {latest.map((news, i) => {
            const cfg = CATEGORY_CONFIG[news.category]
            const Icon = cfg.icon
            return (
              <motion.article
                key={news.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-xl border border-border bg-surface-2 p-5 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className={`rounded-lg p-2 ${cfg.color}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-xs text-text-muted">{cfg.label}</span>
                </div>
                <Link href={`/news/${encodeURIComponent(news.id)}`} className="block">
                  <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-text-strong transition-colors group-hover:text-indigo-300">{news.title}</h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-text-muted">{news.summary}</p>
                </Link>
                <time className="mt-3 block text-xs text-text-faint">
                  {new Date(news.eventDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
