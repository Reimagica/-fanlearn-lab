/**
 * Semantic Scholar API 工具
 * API Docs: https://api.semanticscholar.org/graph/v1
 * 无需 API Key，免费使用，覆盖 200M+ 论文
 */

const BASE_URL = 'https://api.semanticscholar.org/graph/v1'

const PAPER_FIELDS = [
  'title', 'authors', 'year', 'venue', 'citationCount',
  'doi', 'externalIds', 'abstract', 'isOpenAccess', 'openAccessPdf',
].join(',')

export interface SSPaper {
  paperId: string
  title: string
  authors: Array<{ name: string; authorId: string }>
  year: number
  venue: string
  citationCount: number
  doi?: string
  externalIds?: { ArXiv?: string; DOI?: string }
  abstract?: string
  isOpenAccess?: boolean
  openAccessPdf?: { url: string }
}

export interface SSAuthor {
  authorId: string
  name: string
  aliases?: string[]
  hIndex?: number
  citationCount?: number
  papers?: SSPaper[]
}

// 按标题/关键词搜索论文
export async function searchPaper(query: string): Promise<SSPaper[]> {
  const url = new URL(`${BASE_URL}/paper/search`)
  url.searchParams.set('query', query)
  url.searchParams.set('fields', PAPER_FIELDS)
  url.searchParams.set('limit', '5')

  const resp = await fetch(url.toString(), {
    headers: { 'User-Agent': 'FanLearnLab/1.0 (academic-website)' },
    next: { revalidate: 3600 }, // 缓存1小时
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) throw new Error(`SS API error: ${resp.status}`)
  const data = await resp.json()
  return data.data ?? []
}

// 按 DOI 精确查询论文
export async function fetchPaperByDoi(doi: string): Promise<SSPaper | null> {
  const url = `${BASE_URL}/paper/DOI:${encodeURIComponent(doi)}?fields=${PAPER_FIELDS}`

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'FanLearnLab/1.0 (academic-website)' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) return null
  return resp.json()
}

// 获取作者所有论文（用于爬虫）
export async function fetchAuthorPapers(ssAuthorId: string): Promise<SSPaper[]> {
  const url = `${BASE_URL}/author/${ssAuthorId}/papers?fields=${PAPER_FIELDS}&limit=50`

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'FanLearnLab/1.0 (academic-website)' },
    next: { revalidate: 86400 }, // 缓存24小时
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) throw new Error(`SS author API error: ${resp.status}`)
  const data = await resp.json()
  return data.data ?? []
}

// 获取作者统计（h-index, 引用数）
export async function fetchAuthorStats(ssAuthorId: string): Promise<SSAuthor | null> {
  const fields = 'name,aliases,hIndex,citationCount'
  const url = `${BASE_URL}/author/${ssAuthorId}?fields=${fields}`

  const resp = await fetch(url, {
    headers: { 'User-Agent': 'FanLearnLab/1.0 (academic-website)' },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) return null
  return resp.json()
}
