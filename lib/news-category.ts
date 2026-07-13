import type { NewsCategory } from '@/types'

export const NEWS_CATEGORIES = ['paper', 'academic', 'member'] as const satisfies readonly NewsCategory[]

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  paper: '论文发表',
  academic: '学术动态',
  member: '成员动态',
}

const LEGACY_CATEGORY_MAP: Record<string, NewsCategory> = {
  paper: 'paper',
  academic: 'academic',
  talk: 'academic',
  award: 'academic',
  other: 'academic',
  member: 'member',
  graduation: 'member',
  new_member: 'member',
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === 'string' && NEWS_CATEGORIES.includes(value as NewsCategory)
}

export function normalizeNewsCategory(value: unknown): NewsCategory {
  return typeof value === 'string' ? (LEGACY_CATEGORY_MAP[value] ?? 'academic') : 'academic'
}
