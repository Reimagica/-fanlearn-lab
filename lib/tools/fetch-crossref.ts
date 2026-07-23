/**
 * Crossref REST API 工具
 * API Docs: https://api.crossref.org/
 * 用于补充国内外论文元数据，尤其是中文标题和非 DOI 线索的兜底检索
 */

const BASE_URL = 'https://api.crossref.org'
const USER_AGENT = 'FanLearnLab/1.0 (academic-website)'

export interface CrossrefWork {
  DOI?: string
  title?: string[]
  author?: Array<{
    given?: string
    family?: string
    name?: string
  }>
  'container-title'?: string[]
  'short-container-title'?: string[]
  publisher?: string
  type?: string
  language?: string
  abstract?: string
  URL?: string
  link?: Array<{
    URL?: string
    'content-type'?: string
    'content-version'?: string
    'intended-application'?: string
  }>
  issued?: {
    'date-parts'?: number[][]
  }
  'published-print'?: {
    'date-parts'?: number[][]
  }
  'published-online'?: {
    'date-parts'?: number[][]
  }
  created?: {
    'date-parts'?: number[][]
  }
  'is-referenced-by-count'?: number
  event?: {
    name?: string
  }
  ISBN?: string[]
}

function fetchCrossrefJson(path: string) {
  return fetch(`${BASE_URL}${path}`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  })
}

export interface CrossrefSearchOptions {
  title?: string
  author?: string
  authors?: string[]
  bibliographic?: string
}

export async function searchCrossrefWorks(query: string, options: CrossrefSearchOptions = {}): Promise<CrossrefWork[]> {
  const requests = new Map<string, Promise<Response>>()
  const push = (path: string) => {
    if (!requests.has(path)) {
      requests.set(path, fetchCrossrefJson(path))
    }
  }

  const title = options.title?.trim() || query.trim()
  const bibliographic = options.bibliographic?.trim() || query.trim()
  const author = options.author?.trim()
  const authors = (options.authors ?? []).map((value) => value.trim()).filter(Boolean)

  if (title) push(`/works?query.title=${encodeURIComponent(title)}&rows=5`)
  if (bibliographic) push(`/works?query.bibliographic=${encodeURIComponent(bibliographic)}&rows=5`)
  if (author) push(`/works?query.author=${encodeURIComponent(author)}&rows=5`)
  for (const authorValue of authors) {
    push(`/works?query.author=${encodeURIComponent(authorValue)}&rows=5`)
  }

  const responses = await Promise.all(requests.values())

  if (responses.every((response) => !response.ok)) {
    throw new Error(`Crossref error: ${responses.map((response) => response.status).join('/')}`)
  }

  const datas = await Promise.all(responses.map((response) => (response.ok ? response.json() : Promise.resolve({ message: { items: [] } }))))

  return mergeCrossrefItems(
    datas.flatMap((data) => data.message?.items ?? []),
  )
}

export async function fetchCrossrefWorkByDoi(doi: string): Promise<CrossrefWork | null> {
  const resp = await fetchCrossrefJson(`/works/${encodeURIComponent(doi)}`)
  if (!resp.ok) return null
  const data = await resp.json()
  return data.message ?? null
}

function mergeCrossrefItems(items: CrossrefWork[]): CrossrefWork[] {
  const seen = new Set<string>()
  const merged: CrossrefWork[] = []

  for (const item of items) {
    const key = item.DOI?.trim().toLowerCase() || item.title?.[0]?.trim().toLowerCase() || ''
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}
