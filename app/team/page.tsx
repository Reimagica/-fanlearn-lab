'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Settings, UserRoundCog } from 'lucide-react'
import HexGrid from '@/components/team/HexGrid'
import MemberEditorModal from '@/components/team/MemberEditorModal'
import MemberManagementModal from '@/components/team/MemberManagementModal'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import type { Member, MemberCategory } from '@/types'

const TABS: Array<{ key: MemberCategory; label: string }> = [
  { key: 'advisor', label: '指导老师' },
  { key: 'researcher', label: '研究成员' },
  { key: 'alumni', label: '毕业生' },
]

export default function TeamPage() {
  const { user } = useAuth()
  const { members, updateMember } = useLabData()
  const [tab, setTab] = useState<MemberCategory>('advisor')
  const [editOpen, setEditOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const ownMember = user ? members.find((member) => member.slug === user.memberSlug) : undefined

  const saveOwn = (member: Member) => {
    if (!ownMember) return { ok: false, error: '未找到成员档案' }
    return updateMember({
      ...ownMember,
      name: member.name,
      nameEn: member.nameEn,
      title: member.title,
      researchInterests: member.researchInterests,
      email: member.email,
      bio: member.bio,
      avatarUrl: member.avatarUrl,
      aliases: member.aliases,
    })
  }

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-text-strong sm:text-5xl">团队成员</h1>
        </motion.div>

        {user && (
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            {ownMember && <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text hover:border-indigo-500/30 hover:text-indigo-400"><Pencil size={14} /> 编辑我的信息</button>}
            {user.isAdmin && <button onClick={() => setManageOpen(true)} className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><UserRoundCog size={15} /> 管理成员</button>}
          </div>
        )}

        <div className="mb-12 flex justify-center">
          <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-surface p-1">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-medium transition-all ${tab === key ? 'bg-indigo-500 text-white shadow' : 'text-text-muted hover:text-text-strong'}`}>
                {label}<span className={`ml-1.5 rounded-full px-1.5 text-xs ${tab === key ? 'bg-hairline-strong' : 'bg-surface-2'}`}>{members.filter((member) => member.category === key).length}</span>
              </button>
            ))}
          </div>
        </div>

        <HexGrid members={members} category={tab} />

        {user && !ownMember && (
          <div className="mx-auto mt-10 max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center text-sm text-amber-400"><Settings size={16} className="mr-1 inline" /> 当前账户未关联成员档案，请联系管理员。</div>
        )}
      </div>

      <MemberEditorModal key={`${ownMember?.slug ?? 'none'}-${editOpen}`} open={editOpen} member={ownMember} onClose={() => setEditOpen(false)} onSave={saveOwn} />
      <MemberManagementModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  )
}
