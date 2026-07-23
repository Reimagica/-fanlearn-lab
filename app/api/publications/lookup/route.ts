import {
  AgentHarnessError,
  assertAgentInputWithinPolicy,
  auditAgentRun,
  createAgentTraceId,
} from '@/lib/agent-harness'
import { PublicationLookupInputError, lookupPublicationMetadata } from '@/lib/publication-lookup'

const AGENT_NAME = 'research' as const

/**
 * 论文元数据查询端点
 * GET /api/publications/lookup?title=...&doi=...&author=...&author=...
 * 输入标题、作者或 DOI，多条件之间默认 AND，最多 3 条；
 * title / doi 各最多 1 条，author 支持重复参数但总数最多 3 条
 */
export async function GET(req: Request) {
  const traceId = createAgentTraceId(AGENT_NAME)
  const startedAt = Date.now()
  const { searchParams } = new URL(req.url)
  const titles = searchParams.getAll('title').map((value) => value.trim()).filter(Boolean)
  const dois = searchParams.getAll('doi').map((value) => value.trim()).filter(Boolean)
  const authors = searchParams.getAll('author').map((value) => value.trim()).filter(Boolean)
  const legacyQuery = searchParams.get('query')?.trim() || undefined
  const rawInputSize = titles.reduce((sum, value) => sum + value.length, 0)
    + dois.reduce((sum, value) => sum + value.length, 0)
    + authors.reduce((sum, value) => sum + value.length, 0)
    + (legacyQuery?.length ?? 0)

  if (titles.length === 0 && dois.length === 0 && authors.length === 0 && !legacyQuery) {
    return Response.json(
      { error: '需提供 title、doi 或至少一个 author 条件' },
      { status: 400 },
    )
  }

  const title = titles[0] || undefined
  const doi = dois[0] || undefined
  const hasStructuredConditions = Boolean(title || doi || authors.length > 0)
  const query = hasStructuredConditions ? undefined : legacyQuery
  const inputSize = rawInputSize

  if (titles.length > 1 || dois.length > 1 || authors.length > 3 || titles.length + dois.length + authors.length > 3) {
    auditAgentRun({
      traceId,
      agentName: AGENT_NAME,
      action: 'lookup_publication',
      status: 'blocked',
      durationMs: Date.now() - startedAt,
      inputSize,
      errorName: 'AgentHarnessError',
    })
    return Response.json(
      { error: 'title/doi 最多各 1 条，author 最多 3 条，总条件数最多 3 条' },
      { status: 400 },
    )
  }

  if (titles.some((value) => value.length > 300) || dois.some((value) => value.length > 200) || authors.some((author) => author.length > 120) || (query?.length ?? 0) > 300) {
    auditAgentRun({ traceId, agentName: AGENT_NAME, action: 'lookup_publication', status: 'blocked', durationMs: Date.now() - startedAt, inputSize, errorName: 'AgentHarnessError' })
    return Response.json({ error: '查询内容过长', candidates: [], traceId }, { status: 400 })
  }

  try {
    assertAgentInputWithinPolicy({ agentName: AGENT_NAME, textChars: inputSize })
    const candidates = await lookupPublicationMetadata({
      title,
      doi: doi ?? undefined,
      authors,
      query,
    })
    auditAgentRun({
      traceId,
      agentName: AGENT_NAME,
      action: 'lookup_publication',
      status: 'success',
      durationMs: Date.now() - startedAt,
      inputSize,
      outputSize: JSON.stringify(candidates).length,
    })
    return Response.json({ candidates, traceId, timestamp: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store', 'X-Agent-Trace-Id': traceId } })
  } catch (error) {
    auditAgentRun({
      traceId,
      agentName: AGENT_NAME,
      action: 'lookup_publication',
      status: error instanceof AgentHarnessError || error instanceof PublicationLookupInputError ? 'blocked' : 'failed',
      durationMs: Date.now() - startedAt,
      inputSize,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    console.error('[lookup] publication search error:', error)
    if (error instanceof PublicationLookupInputError) {
      return Response.json(
        { error: error.message, candidates: [], traceId },
        { status: 400 },
      )
    }
    return Response.json(
      { error: '论文查询失败，请稍后重试', candidates: [], traceId },
      { status: 502 },
    )
  }
}
