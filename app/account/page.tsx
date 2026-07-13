'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyRound, Phone, Save, UserRound } from 'lucide-react'
import BackButton from '@/components/layout/BackButton'
import { getMemberAccessLabel, useAuth } from '@/lib/auth'

export default function AccountPage() {
  const { user, updateAccount } = useAuth()
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  if (!user) {
    return <div className="min-h-screen px-4 pb-20 pt-28 text-center"><p className="text-text-muted">请先登录后管理账号。</p><Link href="/login?from=/account" className="mt-4 inline-block text-indigo-400">前往登录</Link></div>
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const result = updateAccount({ phone, currentPassword, newPassword: newPassword || undefined })
    setMessage(result.ok ? '账号信息已更新' : result.error ?? '更新失败')
    if (result.ok) {
      setCurrentPassword('')
      setNewPassword('')
    }
  }

  const inputClass = 'w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none focus:border-indigo-500/50'

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-6"><BackButton label="返回" /></div>
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="mb-8 flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"><UserRound size={22} /></div><div><h1 className="text-xl font-bold text-text-strong">账号与安全</h1><p className="mt-1 text-xs text-text-muted">{user.name} · {getMemberAccessLabel(user)}</p></div></div>
          {user.mustChangePassword && <p className="mb-5 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">当前使用管理员设置的临时密码，请尽快修改。</p>}
          <form onSubmit={save} className="space-y-5">
            <label className="block text-xs text-text-muted"><span className="mb-1.5 flex items-center gap-1.5"><Phone size={13} /> 手机号</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="仅用于账号安全，不在团队页公开" className={inputClass} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs text-text-muted"><span className="mb-1.5 flex items-center gap-1.5"><KeyRound size={13} /> 当前密码</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} /></label>
              <label className="block text-xs text-text-muted"><span className="mb-1.5 flex items-center gap-1.5"><KeyRound size={13} /> 新密码</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="不修改可留空" className={inputClass} /></label>
            </div>
            {message && <p className={`rounded-lg px-3 py-2 text-xs ${message.includes('已更新') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{message}</p>}
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><Save size={14} /> 保存账号设置</button>
          </form>
        </div>
      </div>
    </div>
  )
}
