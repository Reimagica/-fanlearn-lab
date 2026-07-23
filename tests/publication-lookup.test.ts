import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as lookupRouteGET } from '@/app/api/publications/lookup/route'
import { lookupPublicationMetadata, PublicationLookupInputError } from '@/lib/publication-lookup'
import type { CrossrefWork } from '@/lib/tools/fetch-crossref'
import type { DBLPResult } from '@/lib/tools/fetch-dblp'
import type { SSPaper } from '@/lib/tools/fetch-semantic-scholar'

const {
  fetchPaperByDoiMock,
  searchPaperMock,
  fetchCrossrefWorkByDoiMock,
  searchCrossrefWorksMock,
  searchDblpMock,
} = vi.hoisted(() => ({
  fetchPaperByDoiMock: vi.fn(),
  searchPaperMock: vi.fn(),
  fetchCrossrefWorkByDoiMock: vi.fn(),
  searchCrossrefWorksMock: vi.fn(),
  searchDblpMock: vi.fn(),
}))

vi.mock('@/lib/tools/fetch-semantic-scholar', () => ({
  fetchPaperByDoi: fetchPaperByDoiMock,
  searchPaper: searchPaperMock,
}))

vi.mock('@/lib/tools/fetch-crossref', () => ({
  fetchCrossrefWorkByDoi: fetchCrossrefWorkByDoiMock,
  searchCrossrefWorks: searchCrossrefWorksMock,
}))

vi.mock('@/lib/tools/fetch-dblp', () => ({
  searchDblp: searchDblpMock,
}))

function createSSPaper(overrides: Partial<SSPaper> = {}): SSPaper {
  return {
    paperId: overrides.paperId ?? `ss_${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? 'Adaptive Learning Analytics',
    authors: overrides.authors ?? [
      { name: 'Fan Yizhou', authorId: '1' },
      { name: 'Alice', authorId: '2' },
    ],
    year: overrides.year ?? 2026,
    venue: overrides.venue ?? 'Example Venue',
    citationCount: overrides.citationCount ?? 12,
    doi: overrides.doi,
    externalIds: overrides.externalIds,
    abstract: overrides.abstract ?? 'Abstract text.',
    isOpenAccess: overrides.isOpenAccess ?? true,
    openAccessPdf: overrides.openAccessPdf ?? { url: 'https://example.com/paper.pdf' },
  }
}

function createCrossrefWork(overrides: Partial<CrossrefWork> = {}): CrossrefWork {
  return {
    DOI: overrides.DOI ?? `10.1000/${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? ['Adaptive Learning Analytics'],
    author: overrides.author ?? [
      { given: 'Fan', family: 'Yizhou' },
      { given: 'Alice', family: 'Smith' },
    ],
    'container-title': overrides['container-title'] ?? ['Example Journal'],
    publisher: overrides.publisher ?? 'Example Publisher',
    type: overrides.type ?? 'journal-article',
    abstract: overrides.abstract ?? '<jats:p>Abstract text.</jats:p>',
    URL: overrides.URL ?? 'https://example.com/article',
    link: overrides.link ?? [{ URL: 'https://example.com/paper.pdf', 'content-type': 'application/pdf' }],
    issued: overrides.issued ?? { 'date-parts': [[2026]] },
    'is-referenced-by-count': overrides['is-referenced-by-count'] ?? 8,
  }
}

function createDBLPHit(overrides: Partial<DBLPResult> = {}): DBLPResult {
  return {
    info: {
      title: overrides.info?.title ?? 'Adaptive Learning Analytics',
      authors: overrides.info?.authors ?? { author: ['Fan Yizhou', 'Alice Smith'] },
      venue: overrides.info?.venue ?? 'Example Conference',
      year: overrides.info?.year ?? '2026',
      doi: overrides.info?.doi,
      url: overrides.info?.url ?? 'https://example.com/dblp',
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()

  const matchingPaper = createSSPaper({
    title: 'Adaptive Learning Analytics',
    authors: [
      { name: 'Fan Yizhou', authorId: '1' },
      { name: 'Alice', authorId: '2' },
    ],
  })
  const titleOnlyPaper = createSSPaper({
    paperId: 'ss_title_only',
    title: 'Adaptive Learning Analytics for Teachers',
    authors: [{ name: 'Bob Smith', authorId: '3' }],
  })
  const authorOnlyPaper = createSSPaper({
    paperId: 'ss_author_only',
    title: 'Educational Data Mining Practice',
    authors: [{ name: 'Fan Yizhou', authorId: '1' }],
  })

  searchPaperMock.mockResolvedValue([matchingPaper, titleOnlyPaper, authorOnlyPaper])
  searchCrossrefWorksMock.mockResolvedValue([
    createCrossrefWork({ title: ['Adaptive Learning Analytics'], author: [{ given: 'Fan', family: 'Yizhou' }, { given: 'Alice', family: 'Smith' }] }),
    createCrossrefWork({ DOI: '10.1000/title-only', title: ['Adaptive Learning Analytics for Teachers'], author: [{ given: 'Bob', family: 'Smith' }] }),
    createCrossrefWork({ DOI: '10.1000/author-only', title: ['Educational Data Mining Practice'], author: [{ given: 'Fan', family: 'Yizhou' }] }),
  ])
  searchDblpMock.mockResolvedValue([
    createDBLPHit({ info: { title: 'Adaptive Learning Analytics', authors: { author: ['Fan Yizhou', 'Alice Smith'] }, venue: 'Example Conference', year: '2026' } }),
    createDBLPHit({ info: { title: 'Adaptive Learning Analytics for Teachers', authors: { author: ['Bob Smith'] }, venue: 'Example Conference', year: '2026' } }),
    createDBLPHit({ info: { title: 'Educational Data Mining Practice', authors: { author: ['Fan Yizhou'] }, venue: 'Example Conference', year: '2026' } }),
  ])
  fetchPaperByDoiMock.mockResolvedValue(null)
  fetchCrossrefWorkByDoiMock.mockResolvedValue(null)
})

describe('论文自动查询', () => {
  it('应按照标题与作者的 AND 条件收窄候选结果', async () => {
    const candidates = await lookupPublicationMetadata({
      title: 'Adaptive Learning Analytics',
      authors: ['Fan Yizhou'],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0].paper.title).toBe('Adaptive Learning Analytics')
    expect(candidates[0].paper.authors).toEqual(expect.arrayContaining(['Fan Yizhou']))
    expect(candidates[0].matchedFields).toEqual(expect.arrayContaining(['title', 'authors']))
  })

  it('应优先按 DOI 精确补全', async () => {
    fetchPaperByDoiMock.mockResolvedValue(createSSPaper({
      paperId: 'ss_doi',
      title: 'Exact DOI Match',
      doi: '10.1234/exact.2026.1',
      authors: [{ name: 'Fan Yizhou', authorId: '1' }],
    }))
    fetchCrossrefWorkByDoiMock.mockResolvedValue(createCrossrefWork({
      DOI: '10.1234/exact.2026.1',
      title: ['Exact DOI Match'],
      author: [{ given: 'Fan', family: 'Yizhou' }],
    }))

    const candidates = await lookupPublicationMetadata({
      doi: '10.1234/exact.2026.1',
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0].paper.doi).toBe('10.1234/exact.2026.1')
    expect(candidates[0].matchedFields).toEqual(expect.arrayContaining(['doi']))
  })

  it('超过三个作者条件时应直接拒绝', async () => {
    await expect(lookupPublicationMetadata({
      title: 'Adaptive Learning Analytics',
      authors: ['Amy Li', 'Ben Li', 'Cindy Wu', 'David Zhou'],
    })).rejects.toBeInstanceOf(PublicationLookupInputError)
  })

  it('路由层应拒绝超出上限的组合检索条件', async () => {
    const response = await lookupRouteGET(new Request('https://example.com/api/publications/lookup?title=A&author=B&author=C&author=D'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('最多 3 条')
  })
})
