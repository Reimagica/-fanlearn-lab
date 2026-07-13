import { searchPaper, fetchPaperByDoi } from '@/lib/tools/fetch-semantic-scholar'
import type { Publication, PublicationType } from '@/types'

/**
 * 论文元数据查询端点
 * GET /api/publications/lookup?query=...&doi=...
 * 输入 DOI 或标题，调用 Semantic Scholar API 返回结构化论文信息
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const doi = searchParams.get('doi')?.trim()
  const query = searchParams.get('query')?.trim()

  if (!doi && !query) {
    return Response.json(
      { error: '需提供 doi 或 query 参数' },
      { status: 400 },
    )
  }
  if ((doi?.length ?? 0) > 200 || (query?.length ?? 0) > 300) {
    return Response.json({ error: '查询内容过长', results: [] }, { status: 400 })
  }

  try {
    // DOI 精确查询优先
    if (doi) {
      const paper = await fetchPaperByDoi(doi)
      if (!paper) {
        return Response.json({ results: [] })
      }
      return Response.json({ results: [normalizeSSPaper(paper)] })
    }

    // 标题模糊查询（query 此时必为 string）
    const papers = await searchPaper(query as string)
    return Response.json({ results: papers.map(normalizeSSPaper) })
  } catch (err) {
    console.error('[lookup] SS API error:', err)
    return Response.json(
      { error: '论文查询失败，请稍后重试', results: [] },
      { status: 502 },
    )
  }
}

function normalizeSSPaper(p: Awaited<ReturnType<typeof searchPaper>>[0]): Publication {
  const arxivId = p.externalIds?.ArXiv
  const pubType: PublicationType = inferPubType(p.venue)
  return {
    id: `ss_${p.paperId}`,
    title: p.title,
    authors: p.authors.map((a) => a.name),
    venue: p.venue || '',
    year: p.year || new Date().getFullYear(),
    doi: p.doi || p.externalIds?.DOI,
    arxivId,
    pdfUrl: p.openAccessPdf?.url,
    sourceUrl: p.doi || p.externalIds?.DOI
      ? `https://doi.org/${p.doi || p.externalIds?.DOI}`
      : arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : undefined,
    language: /[\u3400-\u9fff]/.test(p.title) ? 'zh' : 'en',
    abstract: p.abstract,
    pubType,
    citationCount: p.citationCount || 0,
    downloadCount: 0,
    isHighlight: false,
    status: 'pending_review',
    source: 'agent',
    relatedMemberSlugs: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }
}

function inferPubType(venue: string): PublicationType {
  const v = venue.toLowerCase()
  if (!v) return 'preprint'
  if (v.includes('arxiv') || v.includes('preprint')) return 'preprint'
  if (v.includes('thesis') || v.includes('dissertation')) return 'thesis'
  // 简单启发：CS 顶会/期刊名常见词
  const confKeywords = ['proceedings', 'conference', 'workshop', 'acl', 'emnlp', 'neurips', 'iclr', 'icml', 'cvpr', 'aaai', 'ijcai', 'aied', 'edm', 'lak']
  if (confKeywords.some((k) => v.includes(k))) return 'conference'
  return 'journal'
}
