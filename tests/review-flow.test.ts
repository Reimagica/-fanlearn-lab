import { describe, expect, it } from 'vitest'
import type { NewsItem, Publication, ReviewQueueItem } from '@/types'
import { createReview } from '@/lib/lab-data'

function createPublication(): Publication {
  return {
    id: 'paper-1',
    title: 'AI for Education',
    authors: ['范逸洲'],
    venue: 'Example Venue',
    year: 2026,
    pubType: 'conference',
    citationCount: 0,
    isHighlight: false,
    status: 'published',
    source: 'manual',
    relatedMemberSlugs: ['fan-yizhou'],
    createdAt: '2026-07-01T00:00:00.000Z',
  }
}

function createNews(): NewsItem {
  return {
    id: 'news-1',
    title: '示例动态',
    summary: '示例摘要',
    content: '示例正文',
    category: 'member',
    eventDate: '2026-07-01',
    status: 'published',
    source: 'manual',
    createdAt: '2026-07-01T00:00:00.000Z',
  }
}

describe('提审与审核流', () => {
  it('创建论文审核单时应生成待审记录', () => {
    const review = createReview('publication', createPublication(), { slug: 'majy', name: '马郡阳' })

    expect(review.contentType).toBe('publication')
    expect(review.submitterName).toBe('马郡阳')
    expect(review.humanReviewStatus).toBe('pending')
    expect(review.id).toMatch(/^review_/)
    expect(() => new Date(review.createdAt).toISOString()).not.toThrow()
  })

  it('创建动态审核单时也应保留原始内容', () => {
    const news = createNews()
    const review = createReview('news', news, { slug: 'majy', name: '马郡阳' }) as ReviewQueueItem

    expect(review.content).toBe(news)
    expect(review.contentType).toBe('news')
    expect(review.submitterName).toBe('马郡阳')
  })
})
