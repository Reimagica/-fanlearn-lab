'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useLabData } from '@/lib/lab-data'

export default function LatestPublications() {
  const { publications } = useLabData()
  const latest = [...publications].sort((a, b) => b.year - a.year).slice(0, 3)
  return (
    <section className="bg-surface py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between"><h2 className="text-3xl font-bold text-text-strong">学术成果</h2><Link href="/publications" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">查看全部论文 <ArrowRight size={14} /></Link></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {latest.map((paper, index) => (
            <motion.article key={paper.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
              <Link href={`/publications/${encodeURIComponent(paper.id)}`} className="group block h-full rounded-xl border border-border bg-surface-2 p-5 transition-all hover:border-indigo-500/30">
                <BookOpen size={16} className="mb-3 text-indigo-400" /><p className="mb-2 text-xs text-text-muted">{paper.venue} · {paper.year}</p><h3 className="line-clamp-2 text-sm font-medium leading-6 text-text-strong group-hover:text-indigo-400">{paper.title}</h3><p className="mt-2 line-clamp-1 text-xs text-text-muted">{paper.authors.join(', ')}</p>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
