import { describe, expect, it } from 'vitest'
import { DEFAULT_ACCOUNTS } from '@/lib/auth'

describe('默认账号与权限', () => {
  it('管理员账号应当正确标记，且所有默认密码一致', () => {
    const adminUsernames = DEFAULT_ACCOUNTS.filter((account) => account.isAdmin).map((account) => account.username).sort()

    expect(adminUsernames).toEqual(['fanyz', 'majy'])
    expect(new Set(DEFAULT_ACCOUNTS.map((account) => account.password))).toEqual(new Set(['member123']))
  })

  it('默认账号用户名应唯一', () => {
    const usernames = DEFAULT_ACCOUNTS.map((account) => account.username)
    expect(new Set(usernames).size).toBe(usernames.length)
  })
})
