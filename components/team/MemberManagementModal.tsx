'use client'

import { useState } from 'react'
import { Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import MemberEditorModal from '@/components/team/MemberEditorModal'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import type { AccountRecord, Member } from '@/types'

export default function MemberManagementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, createAccount, removeAccount, syncAccountMember } = useAuth()
  const { members, addMember, updateMember, removeMember } = useLabData()
  const [editing, setEditing] = useState<Member | null | 'new'>(null)

  if (!open || !user?.isAdmin) return null

  const save = (member: Member, account?: Pick<AccountRecord, 'username' | 'password'>) => {
    if (editing === 'new') {
      const memberResult = addMember(member)
      if (!memberResult.ok) return memberResult
      const accountResult = createAccount({
        username: account?.username ?? '',
        password: account?.password ?? '',
        memberSlug: member.slug,
        name: member.name,
        isAdmin: Boolean(member.isAdmin),
        mustChangePassword: true,
      })
      if (!accountResult.ok) {
        removeMember(member.slug)
        return accountResult
      }
      return { ok: true }
    }
    const result = updateMember(member)
    if (result.ok) syncAccountMember(member.slug, { name: member.name, isAdmin: Boolean(member.isAdmin) })
    return result
  }

  const remove = (member: Member) => {
    if (member.slug === user.memberSlug) return
    if (!window.confirm(`确认删除成员“${member.name}”及其登录账户？历史论文和动态将保留。`)) return
    removeMember(member.slug)
    removeAccount(member.slug)
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
            <div><h2 className="flex items-center gap-2 font-semibold text-text-strong"><ShieldCheck size={17} className="text-indigo-400" /> 管理成员</h2><p className="mt-1 text-xs text-text-muted">成员分类与管理员权限相互独立</p></div>
            <button onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-surface-2"><X size={18} /></button>
          </div>
          <div className="p-6">
            <button onClick={() => setEditing('new')} className="mb-5 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><Plus size={14} /> 添加成员</button>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.slug} className="flex items-center gap-4 rounded-xl border border-border bg-surface-2 p-4">
                  <div className="min-w-0 flex-1"><p className="font-medium text-text-strong">{member.name} {member.isAdmin && <span className="ml-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">管理员</span>}</p><p className="mt-1 text-xs text-text-muted">{member.title} · {member.email || '未填写邮箱'}</p></div>
                  <button onClick={() => setEditing(member)} className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-indigo-400" aria-label={`编辑${member.name}`}><Pencil size={15} /></button>
                  <button disabled={member.slug === user.memberSlug} onClick={() => remove(member)} className="rounded-lg p-2 text-text-muted hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`删除${member.name}`}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <MemberEditorModal key={editing === 'new' ? 'new' : editing?.slug ?? 'closed'} open={editing !== null} member={editing === 'new' ? undefined : editing ?? undefined} adminMode onClose={() => setEditing(null)} onSave={save} />
    </>
  )
}
