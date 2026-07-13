'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bell, Bot, LogOut, Menu, Moon, Settings, Sun, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMemberAccessLabel, useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useLabData } from '@/lib/lab-data'

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/team', label: '团队' },
  { href: '/publications', label: '论文' },
  { href: '/news', label: '动态' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { pendingReviews } = useLabData()
  const { theme, toggle } = useTheme()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <span className="text-sm font-bold text-indigo-400">FL</span>
          </div>
          <span className="hidden text-sm font-semibold text-text-strong sm:block">FanLearn Lab</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === link.href
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-text-muted hover:bg-hairline hover:text-text-strong',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="切换主题"
            className="flex items-center justify-center rounded-full border border-border p-1.5 text-text-muted transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-400"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* AI chat button */}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/30 transition-all hover:bg-indigo-500/25 hover:ring-indigo-500/50"
          >
            <Bot size={14} />
            <span className="hidden sm:inline">AI 助手</span>
          </Link>

          {user?.isAdmin && (
            <Link href="/messages" aria-label="消息与审核" className="relative flex items-center justify-center rounded-full border border-border p-1.5 text-text-muted transition-all hover:border-indigo-500/30 hover:text-indigo-400">
              <Bell size={14} />
              {pendingReviews.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 text-white">{pendingReviews.length}</span>}
            </Link>
          )}

          {/* User / Login */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all',
                  'bg-indigo-500/10 text-indigo-400 ring-indigo-500/30 hover:bg-indigo-500/20',
                )}
              >
                <User size={13} />
                <span className="hidden sm:inline">{user.name}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-surface p-2 shadow-xl">
                  <div className="mb-2 px-2 py-1">
                    <p className="text-xs font-medium text-text-strong">{user.name}</p>
                    <span className="text-xs text-indigo-400">{getMemberAccessLabel(user)}</span>
                  </div>
                  <hr className="mb-2 border-border" />
                  {user.memberSlug && (
                    <>
                      <Link href={`/team/${user.memberSlug}`} onClick={() => setUserMenuOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"><User size={12} /> 我的主页</Link>
                      <Link href={`/team/${user.memberSlug}?edit=1`} onClick={() => setUserMenuOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"><Settings size={12} /> 编辑个人资料</Link>
                      <Link href="/account" onClick={() => setUserMenuOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text-strong"><Settings size={12} /> 账号与安全</Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={12} /> 退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-400"
            >
              <User size={13} />
              <span className="hidden sm:inline">登录</span>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="rounded-md p-1.5 text-text-muted hover:bg-hairline md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-border bg-surface px-4 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                pathname === link.href
                  ? 'text-indigo-400'
                  : 'text-text-muted hover:text-text-strong',
              )}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link
              href="/login"
              className="block rounded-md px-3 py-2 text-sm text-text-muted hover:text-text-strong transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              登录
            </Link>
          )}
        </nav>
      )}

      {/* Close user menu on outside click */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </header>
  )
}
