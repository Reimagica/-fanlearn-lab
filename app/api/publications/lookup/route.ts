import { lookupPublicationMetadata } from '@/lib/publication-lookup'

/**
 * 论文元数据查询端点
 * GET /api/publications/lookup?query=...&doi=...&author=...
 * 输入 DOI 或自然语言标题/作者信息，调用多源学术检索返回候选论文结果；
 * author 可作为登录用户姓名的弱线索，在未明确提供作者时辅助排序
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const doi = searchParams.get('doi')?.trim()
  const query = searchParams.get('query')?.trim()
  const author = searchParams.get('author')?.trim()

  if (!doi && !query) {
    return Response.json(
      { error: '需提供 doi 或 query 参数' },
      { status: 400 },
    )
  }

  if ((doi?.length ?? 0) > 200 || (query?.length ?? 0) > 300 || (author?.length ?? 0) > 100) {
    return Response.json({ error: '查询内容过长', results: [] }, { status: 400 })
  }

  try {
    const results = await lookupPublicationMetadata({
      doi: doi ?? undefined,
      query: query ?? undefined,
      author: author ?? undefined,
    })
    return Response.json({ results })
  } catch (error) {
    console.error('[lookup] publication search error:', error)
    return Response.json(
      { error: '论文查询失败，请稍后重试', results: [] },
      { status: 502 },
    )
  }
}
