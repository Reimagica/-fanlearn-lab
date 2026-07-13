'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate } from 'framer-motion'
import { useLabData } from '@/lib/lab-data'

interface StatItem {
  label: string
  value: number
  suffix?: string
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const controls = animate(0, value, {
      duration: 1.8,
      ease: 'easeOut',
      onUpdate(v) {
        setDisplayed(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [isInView, value])

  return (
    <span ref={ref} className="tabular-nums">
      {displayed.toLocaleString()}
      {suffix}
    </span>
  )
}

export default function StatsCounter() {
  const { members, publications } = useLabData()
  const published = publications.filter((paper) => paper.status === 'published')
  const stats: StatItem[] = [
    { label: '发表论文', value: published.length },
    { label: '团队成员', value: members.length },
    {
      label: '总引用次数',
      value: published.reduce((total, paper) => total + Math.max(0, paper.citationCount || 0), 0),
    },
  ]

  return (
    <section className="border-y border-border bg-surface py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mb-1 text-4xl font-bold text-indigo-400 sm:text-5xl">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-text-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
