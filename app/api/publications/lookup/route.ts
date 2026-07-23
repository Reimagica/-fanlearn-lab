import {
  AgentHarnessError,
  assertAgentInputWithinPolicy,
  auditAgentRun,
  createAgentTraceId,
} from '@/lib/agent-harness'
import { lookupPublicationMetadata } from '@/lib/publication-lookup'

const AGENT_NAME = 'research' as const

/**
 * 论文元数据查询端点
 * GET /api/publications/lookup?query=...&doi=...&author=...
 * 输入 DOI 或自然语言标题/作者信息，调用多源学术检索返回候选论文结果；
 * author 可作为登录用户姓名的弱线索，在未明确提供作者时辅助排序
 */
export async function GET(req: Request) {
  const traceId = createAgentTraceId(AGENT_NAME)
  const startedAt = Date.now()
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
    auditAgentRun({ traceId, agentName: AGENT_NAME, action: 'lookup_publication', status: 'blocked', durationMs: Date.now() - startedAt, inputSize: (doi?.length ?? 0) + (query?.length ?? 0) + (author?.length ?? 0), errorName: 'AgentHarnessError' })
    return Response.json({ error: '查询内容过长', candidates: [], traceId }, { status: 400 })
  }

  try {
    const inputSize = (doi?.length ?? 0) + (query?.length ?? 0) + (author?.length ?? 0)
    assertAgentInputWithinPolicy({ agentName: AGENT_NAME, textChars: inputSize })
    const candidates = await lookupPublicationMetadata({
      doi: doi ?? undefined,
      query: query ?? undefined,
      author: author ?? undefined,
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
      status: error instanceof AgentHarnessError ? 'blocked' : 'failed',
      durationMs: Date.now() - startedAt,
      inputSize: (doi?.length ?? 0) + (query?.length ?? 0) + (author?.length ?? 0),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    console.error('[lookup] publication search error:', error)
    return Response.json(
      { error: '论文查询失败，请稍后重试', candidates: [], traceId },
      { status: 502 },
    )
  }
}
