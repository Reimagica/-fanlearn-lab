import { describe, expect, it } from 'vitest'
import type { Member, Publication } from '@/types'
import { getMemberPapers, isPaperByMember } from '@/lib/member-match'

function createMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    slug: 'fan-yizhou',
    name: '范逸洲',
    nameEn: 'Yizhou Fan',
    category: 'advisor',
    title: '副教授',
    avatarUrl: '/avatar.png',
    bio: '研究教育 AI。',
    researchInterests: ['AI for Education'],
    joinYear: 2020,
    isActive: true,
    ...overrides,
  }
}

function createPaper(overrides: Partial<Publication> = {}): Publication {
  return {
    id: `paper-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Example Paper',
    authors: ['范逸洲'],
    venue: 'Example Venue',
    year: 2026,
    pubType: 'conference',
    citationCount: 0,
    isHighlight: false,
    status: 'published',
    source: 'manual',
    relatedMemberSlugs: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('成员-论文匹配', () => {
  it('应根据作者名自动识别成员论文', () => {
    const member = createMember()
    const paper = createPaper({ authors: ['Yizhou Fan', 'Another Author'] })

    expect(isPaperByMember(paper, member)).toBe(true)
  })

  it('显式关联应优先于作者名自动匹配', () => {
    const member = createMember()
    const paper = createPaper({
      authors: ['Yizhou Fan'],
      relatedMemberSlugs: ['another-member'],
    })

    expect(isPaperByMember(paper, member)).toBe(false)
  })

  it('成员论文列表应按年份倒序排列', () => {
    const member = createMember()
    const papers = [
      createPaper({ id: 'p1', year: 2024, authors: ['Yizhou Fan'] }),
      createPaper({ id: 'p2', year: 2026, authors: ['Yizhou Fan'] }),
      createPaper({ id: 'p3', year: 2025, authors: ['Yizhou Fan'] }),
    ]

    expect(getMemberPapers(member, papers).map((paper) => paper.id)).toEqual(['p2', 'p3', 'p1'])
  })
})
