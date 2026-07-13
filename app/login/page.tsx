'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { getMemberAccessLabel, useAuth } from '@/lib/auth'
import { Lock, User, LogIn, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
  const { login, user, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const ok = await login(username.trim(), password)
    setLoading(false)
    if (ok) {
      router.push(from)
    } else {
      setError('用户名或密码错误')
    }
  }

  // Already logged in
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center"
        >
          <div className="mb-4 text-4xl">👋</div>
          <p className="mb-1 text-lg font-semibold text-text-strong">你好，{user.name}</p>
          <span className="inline-block rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-medium text-indigo-400">{getMemberAccessLabel(user)}</span>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/"
              className="block rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-all hover:bg-indigo-500"
            >
              返回首页
            </Link>
            <button
              onClick={() => { logout(); router.push('/') }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-all hover:bg-surface-2 hover:text-text-strong"
            >
              退出登录
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        {/* Back */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ChevronLeft size={16} /> 返回首页
        </Link>

        <div className="rounded-2xl border border-border bg-surface p-8">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30">
              <span className="text-lg font-bold text-indigo-400">FL</span>
            </div>
            <h1 className="text-xl font-bold text-text-strong">FanLearn Lab</h1>
            <p className="mt-1 text-xs text-text-muted">课题组内部登录</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                用户名
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                密码
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow transition-all hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline-strong border-t-white" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          {/* Hint */}
          <p className="mt-5 text-center text-xs text-text-faint">
            游客可直接浏览所有公开内容，无需登录
          </p>

          {/* Role descriptions */}
          <div className="mt-4 space-y-1.5 rounded-xl bg-surface-2 p-3">
            <p className="mb-2 text-xs font-medium text-text-muted">权限说明</p>
            {[
              { role: '游客', desc: '浏览公开内容' },
              { role: '成员', desc: '维护个人信息、提交论文与动态' },
              { role: '管理员', desc: '成员可附加的管理权限' },
            ].map((item) => (
              <div key={item.role} className="flex items-center justify-between">
                <span className="text-xs text-text-muted">{item.role}</span>
                <span className="text-xs text-text-faint">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen pt-24" />}><LoginContent /></Suspense>
}
