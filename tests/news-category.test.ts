import { describe, expect, it } from 'vitest'
import type { NewsItem } from '@/types'
import { migrateNewsItem } from '@/lib/lab-data'
import { isNewsCategory, normalizeNewsCategory } from '@/lib/news-category'

function createNewsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-1',
    title: '示例动态',
    summary: '',
    content: '这是一个示例动态正文。',
    category: 'academic',
    eventDate: '2026-07-01',
    status: 'published',
    source: 'manual',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('动态分类迁移', () => {
  it('应识别三类有效动态分类', () => {
    expect(isNewsCategory('paper')).toBe(true)
    expect(isNewsCategory('academic')).toBe(true)
    expect(isNewsCategory('member')).toBe(true)
    expect(isNewsCategory('talk')).toBe(false)
  })

  it('应把旧分类映射到新分类', () => {
    expect(normalizeNewsCategory('talk')).toBe('academic')
    expect(normalizeNewsCategory('award')).toBe('academic')
    expect(normalizeNewsCategory('new_member')).toBe('member')
    expect(normalizeNewsCategory(undefined)).toBe('academic')
  })

  it('迁移时应补充摘要和成员关联', () => {
    const legacyItem = createNewsItem({
      category: 'academic',
      memberSlug: 'majy',
      summary: '',
    })
    const migrated = migrateNewsItem({
      ...legacyItem,
      category: 'talk',
    } as NewsItem)

    expect(migrated.category).toBe('academic')
    expect(migrated.summary).toContain('示例动态正文')
    expect(migrated.relatedMemberSlugs).toEqual(['majy'])
  })
})
