'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AccountRecord } from '@/types'

export interface AuthUser {
  name: string
  memberSlug: string
  isAdmin: boolean
  phone?: string
  mustChangePassword?: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  createAccount: (account: AccountRecord) => { ok: boolean; error?: string }
  removeAccount: (memberSlug: string) => void
  syncAccountMember: (memberSlug: string, updates: { name: string; isAdmin: boolean }) => void
  updateAccount: (updates: { phone?: string; currentPassword?: string; newPassword?: string }) => { ok: boolean; error?: string }
  getAccountByMember: (memberSlug: string) => AccountRecord | undefined
  isGuest: boolean
}

const DEFAULT_ACCOUNTS: AccountRecord[] = [
  { username: 'fanyz', password: 'member123', name: '范逸洲', memberSlug: 'fan-yizhou', isAdmin: true },
  { username: 'xiamy', password: 'member123', name: '夏梦雨', memberSlug: 'xia-mengyu', isAdmin: false },
  { username: 'zhutl', password: 'member123', name: '朱桃林', memberSlug: 'zhu-taolin', isAdmin: false },
  { username: 'majy', password: 'member123', name: '马郡阳', memberSlug: 'ma-junyang', isAdmin: true },
  { username: 'membera', password: 'member123', name: '成员A', memberSlug: 'member-a', isAdmin: false },
  { username: 'memberb', password: 'member123', name: '成员B', memberSlug: 'member-b', isAdmin: false },
  { username: 'memberc', password: 'member123', name: '成员C', memberSlug: 'member-c', isAdmin: false },
  { username: 'memberd', password: 'member123', name: '成员D', memberSlug: 'member-d', isAdmin: false },
  { username: 'membere', password: 'member123', name: '成员E', memberSlug: 'member-e', isAdmin: false },
  { username: 'memberf', password: 'member123', name: '成员F', memberSlug: 'member-f', isAdmin: false },
  { username: 'xujq', password: 'member123', name: '许家奇', memberSlug: 'xu-jiaqi', isAdmin: false },
  { username: 'lizj', password: 'member123', name: '李子健', memberSlug: 'li-zijian', isAdmin: false },
  { username: 'maling', password: 'member123', name: '马玲', memberSlug: 'ma-ling', isAdmin: false },
  { username: 'tanglz', password: 'member123', name: '唐陆禛', memberSlug: 'tang-luzhen', isAdmin: false },
]

const USER_STORAGE_KEY = 'fl_auth_user'
const ACCOUNT_STORAGE_KEY = 'fl_member_accounts'
const ACCOUNT_DATA_VERSION_KEY = 'fl_account_data_version'
const ACCOUNT_DATA_VERSION = '2026-07-13-content-batch-v3'

function readAccounts(): AccountRecord[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS
  try {
    const stored = localStorage.getItem(ACCOUNT_STORAGE_KEY)
    if (!stored) {
      localStorage.setItem(ACCOUNT_DATA_VERSION_KEY, ACCOUNT_DATA_VERSION)
      return DEFAULT_ACCOUNTS
    }

    const accounts = JSON.parse(stored) as AccountRecord[]
    if (localStorage.getItem(ACCOUNT_DATA_VERSION_KEY) === ACCOUNT_DATA_VERSION) return accounts

    const accountMap = new Map(accounts.map((account) => [account.memberSlug, { ...account, password: 'member123' }]))
    for (const defaultAccount of DEFAULT_ACCOUNTS) {
      const existing = accountMap.get(defaultAccount.memberSlug)
      accountMap.set(defaultAccount.memberSlug, {
        ...defaultAccount,
        ...existing,
        username: defaultAccount.username,
        password: 'member123',
      })
    }
    const migrated = Array.from(accountMap.values())
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(migrated))
    localStorage.setItem(ACCOUNT_DATA_VERSION_KEY, ACCOUNT_DATA_VERSION)
    return migrated
  } catch {
    return DEFAULT_ACCOUNTS
  }
}

function persistAccounts(accounts: AccountRecord[]) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts))
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accounts, setAccounts] = useState<AccountRecord[]>(DEFAULT_ACCOUNTS)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextAccounts = readAccounts()
      setAccounts(nextAccounts)
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY)
        if (!storedUser) return
        const parsed = JSON.parse(storedUser) as AuthUser
        const current = nextAccounts.find((account) => account.memberSlug === parsed.memberSlug)
        if (current) {
          setUser({
            name: current.name,
            memberSlug: current.memberSlug,
            isAdmin: current.isAdmin,
            phone: current.phone,
            mustChangePassword: current.mustChangePassword,
          })
        }
      } catch {}
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    const account = accounts.find((item) => item.username === username && item.password === password)
    if (!account) return false
    const nextUser: AuthUser = {
      name: account.name,
      memberSlug: account.memberSlug,
      isAdmin: account.isAdmin,
      phone: account.phone,
      mustChangePassword: account.mustChangePassword,
    }
    setUser(nextUser)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  const commitAccounts = (next: AccountRecord[]) => {
    setAccounts(next)
    persistAccounts(next)
  }

  const createAccount = (account: AccountRecord) => {
    if (accounts.some((item) => item.username.toLowerCase() === account.username.toLowerCase())) {
      return { ok: false, error: '用户名已存在' }
    }
    if (accounts.some((item) => item.memberSlug === account.memberSlug)) {
      return { ok: false, error: '该成员已有登录账户' }
    }
    commitAccounts([...accounts, account])
    return { ok: true }
  }

  const removeAccount = (memberSlug: string) => {
    commitAccounts(accounts.filter((item) => item.memberSlug !== memberSlug))
  }

  const syncAccountMember = (memberSlug: string, updates: { name: string; isAdmin: boolean }) => {
    const next = accounts.map((item) => item.memberSlug === memberSlug ? { ...item, ...updates } : item)
    commitAccounts(next)
    if (user?.memberSlug === memberSlug) {
      const nextUser = { ...user, ...updates }
      setUser(nextUser)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    }
  }

  const updateAccount = (updates: { phone?: string; currentPassword?: string; newPassword?: string }) => {
    if (!user) return { ok: false, error: '请先登录' }
    const index = accounts.findIndex((item) => item.memberSlug === user.memberSlug)
    if (index < 0) return { ok: false, error: '账户不存在' }
    const account = accounts[index]
    if (updates.newPassword) {
      if (account.password !== updates.currentPassword) return { ok: false, error: '当前密码不正确' }
      if (updates.newPassword.length < 6) return { ok: false, error: '新密码至少 6 位' }
    }
    const updated: AccountRecord = {
      ...account,
      phone: updates.phone ?? account.phone,
      password: updates.newPassword || account.password,
      mustChangePassword: updates.newPassword ? false : account.mustChangePassword,
    }
    const next = [...accounts]
    next[index] = updated
    commitAccounts(next)
    const nextUser = { ...user, phone: updated.phone, mustChangePassword: updated.mustChangePassword }
    setUser(nextUser)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    return { ok: true }
  }

  const value: AuthContextValue = {
    user,
    login,
    logout,
    createAccount,
    removeAccount,
    syncAccountMember,
    updateAccount,
    getAccountByMember: (memberSlug) => accounts.find((item) => item.memberSlug === memberSlug),
    isGuest: !user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function getMemberAccessLabel(user: AuthUser | null) {
  if (!user) return '游客'
  return user.isAdmin ? '课题组成员 · 管理员' : '课题组成员'
}
