/**
 * Agent Harness — AI 能力的统一运行边界
 *
 * 这里不仅声明“谁能调用什么”，还提供实际执行包装、输入预算、超时和
 * 去敏审计。所有新增 AI 路由都应复用本文件，避免在业务路由中自行放宽权限。
 */

type OrchestratorTool = 'classify_intent'

type IntakeTool =
  | 'search_existing_member'
  | 'search_existing_paper'
  | 'fetch_doi_metadata'
  | 'ask_user_clarification'

type NewsDraftTool = never

type ResearchTool = 'fetch_semantic_scholar' | 'fetch_dblp' | 'fetch_crossref'

type QATool =
  | 'search_lab_info'
  | 'guide_publication_submission'
  | 'guide_news_submission'

type ModerationTool =
  | 'read_pending_content'
  | 'check_content_safety'
  | 'verify_doi_crossref'
  | 'check_duplicate'
  | 'prepare_review_recommendation'

type WatchdogTool = 'read_agent_audit' | 'read_published_content' | 'create_admin_alert'

export const AGENT_TOOL_REGISTRY = {
  orchestrator: ['classify_intent'] as const satisfies readonly OrchestratorTool[],
  intake: [
    'search_existing_member',
    'search_existing_paper',
    'fetch_doi_metadata',
    'ask_user_clarification',
  ] as const satisfies readonly IntakeTool[],
  news_draft: [] as const satisfies readonly NewsDraftTool[],
  research: ['fetch_semantic_scholar', 'fetch_dblp', 'fetch_crossref'] as const satisfies readonly ResearchTool[],
  qa: ['search_lab_info', 'guide_publication_submission', 'guide_news_submission'] as const satisfies readonly QATool[],
  moderation: [
    'read_pending_content',
    'check_content_safety',
    'verify_doi_crossref',
    'check_duplicate',
    'prepare_review_recommendation',
  ] as const satisfies readonly ModerationTool[],
  watchdog: ['read_agent_audit', 'read_published_content', 'create_admin_alert'] as const satisfies readonly WatchdogTool[],
} as const

export type AgentName = keyof typeof AGENT_TOOL_REGISTRY

export interface AgentRuntimePolicy {
  maxInputChars: number
  maxAttachments: number
  maxAttachmentChars: number
  maxSteps: number
  maxRetries: number
  timeoutMs: number
  canPublish: false
  requiresHumanReview: boolean
}

export const AGENT_RUNTIME_POLICIES: Record<AgentName, AgentRuntimePolicy> = {
  orchestrator: { maxInputChars: 6_000, maxAttachments: 0, maxAttachmentChars: 0, maxSteps: 1, maxRetries: 1, timeoutMs: 15_000, canPublish: false, requiresHumanReview: true },
  intake: { maxInputChars: 55_000, maxAttachments: 5, maxAttachmentChars: 10_000, maxSteps: 1, maxRetries: 1, timeoutMs: 30_000, canPublish: false, requiresHumanReview: true },
  news_draft: { maxInputChars: 55_000, maxAttachments: 5, maxAttachmentChars: 10_000, maxSteps: 1, maxRetries: 1, timeoutMs: 30_000, canPublish: false, requiresHumanReview: true },
  research: { maxInputChars: 8_000, maxAttachments: 0, maxAttachmentChars: 0, maxSteps: 2, maxRetries: 1, timeoutMs: 25_000, canPublish: false, requiresHumanReview: true },
  qa: { maxInputChars: 80_000, maxAttachments: 5, maxAttachmentChars: 12_000, maxSteps: 3, maxRetries: 1, timeoutMs: 35_000, canPublish: false, requiresHumanReview: true },
  moderation: { maxInputChars: 30_000, maxAttachments: 5, maxAttachmentChars: 10_000, maxSteps: 2, maxRetries: 1, timeoutMs: 30_000, canPublish: false, requiresHumanReview: true },
  watchdog: { maxInputChars: 20_000, maxAttachments: 0, maxAttachmentChars: 0, maxSteps: 1, maxRetries: 0, timeoutMs: 20_000, canPublish: false, requiresHumanReview: true },
}

export class AgentHarnessError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'AgentHarnessError'
  }
}

export function isToolAllowed(agentName: AgentName, toolName: string): boolean {
  return (AGENT_TOOL_REGISTRY[agentName] as readonly string[]).includes(toolName)
}

export function assertToolAllowed(agentName: AgentName, toolName: string): void {
  if (!isToolAllowed(agentName, toolName)) {
    throw new AgentHarnessError(`Agent “${agentName}” 无权调用工具 “${toolName}”`, 403)
  }
}

export function assertAgentInputWithinPolicy(params: {
  agentName: AgentName
  textChars: number
  attachmentCount?: number
  attachmentChars?: number
}): void {
  const policy = AGENT_RUNTIME_POLICIES[params.agentName]
  const attachmentCount = params.attachmentCount ?? 0
  const attachmentChars = params.attachmentChars ?? 0

  if (params.textChars + attachmentChars > policy.maxInputChars) {
    throw new AgentHarnessError(`输入内容过长，请精简至 ${policy.maxInputChars} 字符以内`)
  }
  if (attachmentCount > policy.maxAttachments) {
    throw new AgentHarnessError(`最多上传 ${policy.maxAttachments} 个附件`)
  }
  if (attachmentChars > policy.maxAttachments * policy.maxAttachmentChars) {
    throw new AgentHarnessError('附件文本总量超过处理上限')
  }
}

export function createAgentTraceId(agentName: AgentName): string {
  return `${agentName}_${crypto.randomUUID()}`
}

export function createAgentAbortSignal(agentName: AgentName, requestSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(AGENT_RUNTIME_POLICIES[agentName].timeoutMs)
  return requestSignal ? AbortSignal.any([requestSignal, timeoutSignal]) : timeoutSignal
}

type AuditStatus = 'success' | 'failed' | 'blocked'

function describeValue(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { kind: 'string', chars: value.length }
  if (Array.isArray(value)) return { kind: 'array', items: value.length }
  if (value && typeof value === 'object') return { kind: 'object', keys: Object.keys(value).slice(0, 20) }
  return { kind: typeof value }
}

export function auditAgentRun(params: {
  traceId: string
  agentName: AgentName
  action: string
  status: AuditStatus
  durationMs: number
  inputSize?: number
  outputSize?: number
  errorName?: string
}): void {
  // Phase 4: 改写入服务端 audit_logs。禁止记录提示词、附件正文、账号或模型输出原文。
  console.info('[harness-audit]', JSON.stringify({
    ...params,
    timestamp: new Date().toISOString(),
  }))
}

export async function runGuardedTool<TInput, TOutput>(params: {
  traceId: string
  agentName: AgentName
  toolName: string
  input: TInput
  execute: () => Promise<TOutput> | TOutput
}): Promise<TOutput> {
  const startedAt = Date.now()
  try {
    assertToolAllowed(params.agentName, params.toolName)
    const output = await params.execute()
    console.info('[harness-tool]', JSON.stringify({
      traceId: params.traceId,
      agentName: params.agentName,
      toolName: params.toolName,
      status: 'success',
      input: describeValue(params.input),
      output: describeValue(output),
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))
    return output
  } catch (error) {
    console.warn('[harness-tool]', JSON.stringify({
      traceId: params.traceId,
      agentName: params.agentName,
      toolName: params.toolName,
      status: error instanceof AgentHarnessError ? 'blocked' : 'failed',
      input: describeValue(params.input),
      errorName: error instanceof Error ? error.name : 'UnknownError',
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))
    throw error
  }
}
