/**
 * DBLP API 工具
 * API Docs: https://dblp.org/faq/How+to+use+the+dblp+search+API.html
 * 无需 API Key，CS 领域权威数据源
 */

const DBLP_API = 'https://dblp.org/search/publ/api'

export interface DBLPResult {
  info: {
    title: string
    authors: { author: string | string[] }
    venue: string
    year: string
    doi?: string
    url?: string
  }
}

export async function searchDblp(query: string): Promise<DBLPResult[]> {
  const url = new URL(DBLP_API)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('h', '5')

  const resp = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  })

  if (!resp.ok) throw new Error(`DBLP error: ${resp.status}`)
  const data = await resp.json()
  return data.result?.hits?.hit ?? []
}
