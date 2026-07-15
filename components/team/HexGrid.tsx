'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import type { Member, MemberCategory } from '@/types'

const CATEGORY_LABEL: Record<MemberCategory, string> = {
  advisor: '指导老师',
  researcher: '研究成员',
  alumni: '毕业生',
}

function HexMemberCard({ member }: { member: Member }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link href={`/team/${member.slug}`}>
        {/* Hex shape */}
        <div
          className="hex-clip relative h-32 w-28 cursor-pointer overflow-hidden bg-surface-2 transition-all duration-300"
          style={hovered ? { filter: 'brightness(1.3)' } : {}}
        >
          <Image
            src={member.avatarUrl}
            alt={member.name}
            fill
            className="object-cover"
          />
          {/* Ring glow on hover */}
          {hovered && (
            <div className="absolute inset-0 hex-clip ring-2 ring-indigo-500/50" />
          )}
        </div>
      </Link>

      {/* Name + role */}
      <div className="mt-3 text-center">
        <Link href={`/team/${member.slug}`} className="block text-sm font-medium text-text-strong hover:text-indigo-400 transition-colors">
          {member.name}
        </Link>
        <span className="text-xs text-text-muted">{member.title || CATEGORY_LABEL[member.category]}</span>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-2 left-1/2 z-20 w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface-2 p-3 shadow-xl"
          >
            <p className="mb-1 text-xs font-medium text-text-strong">{member.nameEn}</p>
            <div className="flex flex-wrap gap-1">
              {member.researchInterests.slice(0, 3).map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400"
                >
                  {interest}
                </span>
              ))}
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border bg-surface-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface HexGridProps {
  members: Member[]
  category: MemberCategory
}

export default function HexGrid({ members, category }: HexGridProps) {
  const filtered = members.filter((member) => member.category === category)

  if (filtered.length === 0) {
    return <p className="py-12 text-center text-sm text-text-muted">暂无数据</p>
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 justify-items-center gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {filtered.map((member) => (
        <HexMemberCard key={member.slug} member={member} />
      ))}
    </div>
  )
}
