'use client'

import { Suspense, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, GitBranch, Globe, Mail, Pencil } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import MemberTabs from '@/components/team/MemberTabs'
import MemberEditorModal from '@/components/team/MemberEditorModal'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import { getMemberPapers } from '@/lib/member-match'
import type { Member } from '@/types'

const CATEGORY_LABEL = { advisor: '指导老师', researcher: '研究成员', alumni: '毕业生' }

function MemberDetailContent() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { members, publications, news, updateMember } = useLabData()
  const [editOpen, setEditOpen] = useState(searchParams.get('edit') === '1')
  const member = members.find((item) => item.slug === params.slug)

  if (!member) {
    return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><p className="text-text-muted">未找到该成员。</p><Link href="/team" className="mt-4 inline-block text-indigo-400">返回团队页</Link></div>
  }

  const papers = getMemberPapers(member, publications)
  const memberNews = news.filter((item) => (
    item.memberSlug === member.slug || item.relatedMemberSlugs?.includes(member.slug)
  ) && item.status === 'published')
  const canEdit = user?.memberSlug === member.slug || Boolean(user?.isAdmin)

  const save = (updated: Member) => updateMember({
    ...member,
    name: updated.name,
    nameEn: updated.nameEn,
    title: updated.title,
    researchInterests: updated.researchInterests,
    email: updated.email,
    bio: updated.bio,
    avatarUrl: updated.avatarUrl,
    aliases: updated.aliases,
  })

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <BackButton href="/team" label="团队成员" />
          {canEdit && <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs text-text hover:border-indigo-500/30 hover:text-indigo-400"><Pencil size={13} /> 编辑基础信息</button>}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex flex-col items-center">
                <div className="hex-clip relative h-32 w-28 overflow-hidden"><Image src={member.avatarUrl} alt={member.name} fill className="object-cover" unoptimized={member.avatarUrl.startsWith('data:')} /></div>
                <h1 className="mt-4 text-xl font-bold text-text-strong">{member.name}</h1>
                <p className="text-sm text-text-muted">{member.nameEn}</p>
                <span className="mt-1.5 rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs text-indigo-400">{CATEGORY_LABEL[member.category]} · {member.title}</span>
                {member.isAdmin && <span className="mt-2 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs text-cyan-400">管理员</span>}
              </div>
              <div className="mb-4"><p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">研究方向</p><div className="flex flex-wrap gap-1.5">{member.researchInterests.map((interest) => <span key={interest} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text">{interest}</span>)}</div></div>
              <div className="space-y-2">
                {member.email && <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-text-muted hover:text-indigo-400"><Mail size={13} /> {member.email}</a>}
                {member.googleScholarUrl && <a href={member.googleScholarUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-text-muted hover:text-indigo-400"><BookOpen size={13} /> Google Scholar</a>}
                {member.githubUrl && <a href={member.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-text-muted hover:text-indigo-400"><GitBranch size={13} /> GitHub</a>}
                {member.homepageUrl && <a href={member.homepageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-text-muted hover:text-indigo-400"><Globe size={13} /> 个人主页</a>}
              </div>
            </div>
          </aside>

          <main>
            <div className="mb-6 rounded-2xl border border-border bg-surface p-6"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">个人简介</h2><p className="leading-relaxed text-text">{member.bio}</p></div>
            <MemberTabs papers={papers} news={memberNews} />
          </main>
        </div>
      </div>
      <MemberEditorModal key={`${member.slug}-${editOpen}`} open={editOpen} member={member} onClose={() => setEditOpen(false)} onSave={save} />
    </div>
  )
}

export default function MemberDetailPage() {
  return <Suspense fallback={<div className="min-h-screen pt-24" />}><MemberDetailContent /></Suspense>
}
