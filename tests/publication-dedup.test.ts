import { describe, expect, it } from 'vitest'
import type { Publication } from '@/types'
import { isDuplicatePaper } from '@/lib/lab-data'

function createPaper(overrides: Partial<Publication> = {}): Publication {
  return {
    id: 'paper-1',
    title: 'AI for Education: A Survey',
    authors: ['范逸洲'],
    venue: 'Example Venue',
    year: 2026,
    pubType: 'journal',
    citationCount: 0,
    isHighlight: false,
    status: 'published',
    source: 'manual',
    relatedMemberSlugs: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('论文去重', () => {
  it('应通过 DOI 识别重复论文', () => {
    const existing = [createPaper({ id: 'a', doi: '10.1234/example.1' })]
    const incoming = createPaper({ id: 'b', doi: '10.1234/example.1', title: 'Completely Different Title' })

    expect(isDuplicatePaper(incoming, existing)).toBe(true)
  })

  it('应通过归一化标题识别重复论文', () => {
    const existing = [createPaper({ id: 'a', title: 'AI for Education: A Survey' })]
    const incoming = createPaper({ id: 'b', title: 'AI for Education — A Survey' })

    expect(isDuplicatePaper(incoming, existing)).toBe(true)
  })

  it('不同标题且不同 DOI 不应误判重复', () => {
    const existing = [createPaper({ id: 'a', title: 'AI for Education: A Survey', doi: '10.1234/example.1' })]
    const incoming = createPaper({ id: 'b', title: 'Another Paper', doi: '10.1234/example.2' })

    expect(isDuplicatePaper(incoming, existing)).toBe(false)
  })
})
