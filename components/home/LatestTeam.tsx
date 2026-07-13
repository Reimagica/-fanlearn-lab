'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLabData } from '@/lib/lab-data'

export default function LatestTeam() {
  const { members } = useLabData()
  const visible = members.filter((member) => member.category !== 'alumni').slice(0, 4)
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between"><h2 className="text-3xl font-bold text-text-strong">团队成员</h2><Link href="/team" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300">全部团队成员 <ArrowRight size={14} /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((member, index) => (
            <motion.div key={member.slug} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }}>
              <Link href={`/team/${member.slug}`} className="flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:border-indigo-500/30 hover:bg-surface-2">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full"><Image src={member.avatarUrl} alt={member.name} fill className="object-cover" unoptimized={member.avatarUrl.startsWith('data:')} /></div>
                <div className="min-w-0"><p className="font-medium text-text-strong">{member.name}</p><p className="mt-1 truncate text-xs text-text-muted">{member.title}</p></div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
