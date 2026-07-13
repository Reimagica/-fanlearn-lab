'use client'

import { motion } from 'framer-motion'
import { LAB_INFO } from '@/lib/mock-data'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'linear-gradient(to right, var(--bd-base) 1px, transparent 1px), linear-gradient(to bottom, var(--bd-base) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> {LAB_INFO.university} · {LAB_INFO.department}
          </div>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="text-text-strong">{LAB_INFO.nameCn}</span><span className="mx-3 text-text-faint">·</span><span className="gradient-text">{LAB_INFO.name}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-4 text-base font-medium text-cyan-400/80 sm:text-lg">{LAB_INFO.slogan}</motion.p>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">{LAB_INFO.description}</motion.p>
      </div>
    </section>
  )
}
