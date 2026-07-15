'use client'

import { useState } from 'react'
import { Camera, Save, X } from 'lucide-react'
import type { AccountRecord, Member, MemberCategory } from '@/types'

interface Props {
  open: boolean
  member?: Member
  adminMode?: boolean
  onClose: () => void
  onSave: (member: Member, account?: Pick<AccountRecord, 'username' | 'password'>) => { ok: boolean; error?: string }
}

const EMPTY_MEMBER: Member = {
  id: '',
  slug: '',
  name: '',
  nameEn: '',
  category: 'researcher',
  title: '',
  avatarUrl: '/default-avatar.png',
  bio: '',
  researchInterests: [],
  email: '',
  joinYear: new Date().getFullYear(),
  isActive: true,
  aliases: [],
}

function makeSlug(nameEn: string, name: string) {
  const source = nameEn || name
  return source.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
}

export default function MemberEditorModal({ open, member, adminMode = false, onClose, onSave }: Props) {
  const [form, setForm] = useState<Member>(member ? { ...member } : { ...EMPTY_MEMBER })
  const [interests, setInterests] = useState((member?.researchInterests ?? []).join('、'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('member123')
  const [error, setError] = useState('')
  const isCreating = !member

  const handleImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, avatarUrl: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const slug = form.slug || makeSlug(form.nameEn, form.name)
    if (!form.name.trim() || !form.title.trim() || !form.bio.trim()) {
      setError('请完整填写姓名、职称和个人简介')
      return
    }
    if (isCreating && (!username.trim() || password.length < 6)) {
      setError('新成员需设置用户名和至少 6 位的临时密码')
      return
    }
    const normalized: Member = {
      ...form,
      id: form.id || slug,
      slug,
      isActive: form.category !== 'alumni',
      researchInterests: interests.split(/[,，、]/).map((item) => item.trim()).filter(Boolean),
      aliases: Array.from(new Set([form.name, form.nameEn, ...(form.aliases ?? [])].filter(Boolean))),
    }
    const result = onSave(normalized, isCreating ? { username: username.trim(), password } : undefined)
    if (!result.ok) {
      setError(result.error ?? '保存失败')
      return
    }
    onClose()
  }

  if (!open) return null

  const inputClass = 'w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50'

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div><h2 className="font-semibold text-text-strong">{isCreating ? '添加新成员' : '编辑成员信息'}</h2><p className="mt-1 text-xs text-text-muted">论文和动态请分别在对应页面维护</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-surface-2"><X size={18} /></button>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <label className="text-xs text-text-muted">姓名<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`mt-1.5 ${inputClass}`} /></label>
          <label className="text-xs text-text-muted">英文名<input value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} className={`mt-1.5 ${inputClass}`} /></label>
          {adminMode && (
            <label className="text-xs text-text-muted">成员分类<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as MemberCategory })} className={`mt-1.5 ${inputClass}`}><option value="advisor">指导老师</option><option value="researcher">研究成员</option><option value="alumni">毕业生</option></select></label>
          )}
          <label className="text-xs text-text-muted">职称/身份<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例：副教授、博士研究生" className={`mt-1.5 ${inputClass}`} /></label>
          <label className="text-xs text-text-muted sm:col-span-2">研究方向<input value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="多个方向用逗号或顿号分隔" className={`mt-1.5 ${inputClass}`} /></label>
          <label className="text-xs text-text-muted sm:col-span-2">邮箱<input type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`mt-1.5 ${inputClass}`} /></label>
          <label className="text-xs text-text-muted sm:col-span-2">个人简介<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={5} className={`mt-1.5 resize-none ${inputClass}`} /></label>

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs text-text-muted">个人图片</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-text hover:border-indigo-500/30"><Camera size={14} /> 选择图片<input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0])} className="hidden" /></label>
            <input value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} placeholder="或填写图片 URL" className={`mt-2 ${inputClass}`} />
          </div>

          {adminMode && (
            <label className="flex items-center gap-2 text-sm text-text sm:col-span-2"><input type="checkbox" checked={Boolean(form.isAdmin)} onChange={(event) => setForm({ ...form, isAdmin: event.target.checked })} /> 附加管理员权限</label>
          )}

          {isCreating && (
            <div className="grid gap-4 rounded-xl border border-border bg-surface-2 p-4 sm:col-span-2 sm:grid-cols-2">
              <div className="sm:col-span-2"><p className="text-sm font-medium text-text-strong">初始登录账户</p><p className="mt-1 text-xs text-text-muted">新成员只能在管理员建立档案和账户后登录。</p></div>
              <label className="text-xs text-text-muted">用户名<input value={username} onChange={(event) => setUsername(event.target.value)} className={`mt-1.5 ${inputClass}`} /></label>
              <label className="text-xs text-text-muted">临时密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={`mt-1.5 ${inputClass}`} /></label>
            </div>
          )}
        </div>

        {error && <p className="mx-6 mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-2">取消</button>
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><Save size={14} /> 保存</button>
        </div>
      </form>
    </div>
  )
}
