import { generateObject } from 'ai'
import { z } from 'zod'
import { getDeepSeekModel, hasDeepSeekConfig } from '@/lib/ai-provider'
import {
  AGENT_RUNTIME_POLICIES,
  AgentHarnessError,
  assertAgentInputWithinPolicy,
  auditAgentRun,
  createAgentAbortSignal,
  createAgentTraceId,
} from '@/lib/agent-harness'
import { collectChatKnowledge } from '@/lib/chat-knowledge'

const AGENT_NAME = 'qa' as const
const POLICY = AGENT_RUNTIME_POLICIES[AGENT_NAME]

const AttachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().max(100).optional().default('application/octet-stream'),
  size: z.number().nonnegative().max(5 * 1024 * 1024).optional().default(0),
  content: z.string().max(POLICY.maxAttachmentChars).optional().default(''),
})

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(12_000),
  }).passthrough()).min(1).max(50),
  attachments: z.array(AttachmentSchema).max(POLICY.maxAttachments).optional().default([]),
})

const ChatResponseSchema = z.object({
  answer: z.string().min(1).max(4_000),
  nextStep: z.string().min(1).max(400),
})

const SYSTEM_PROMPT = `你是 FanLearn Lab（泛学习实验室）的 AI 助手 LabMind。

你的任务是基于本站已有事实，回答课题组成员和访客的问题，并给出明确的下一步建议。

能力边界：
1. 你可以回答成员、研究方向、论文、动态和网站使用方法等问题；
2. 你不能声称自己已经写入数据库、创建审核记录或完成发布；
3. 论文和动态都必须由成员在页面中确认后提交，再由管理员人工审核；
4. 如果事实不够，必须明确说不确定，不要编造；
5. 动态类型只有“论文发表、学术动态、成员动态”三种。

输出要求：
- 用中文回复，专业、友好、简洁；
- answer 只写给用户看的直接回答，不要输出 JSON；
- nextStep 只写下一步行动建议，尽量具体；
- 如果证据不足，answer 里要明确说明局限。`

function errorResponse(error: unknown, traceId: string) {
  const status = error instanceof AgentHarnessError ? error.status : 400
  const message = error instanceof AgentHarnessError ? error.message : '请求格式无效'
  return Response.json({ error: message, traceId }, { status })
}

export async function POST(req: Request) {
  const traceId = createAgentTraceId(AGENT_NAME)
  const startedAt = Date.now()

  if (!hasDeepSeekConfig()) {
    return Response.json(
      { error: '请配置 DEEPSEEK_API_KEY 环境变量（在 .env.local 文件中）', traceId },
      { status: 503 },
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = ChatRequestSchema.safeParse(json)
  if (!parsed.success) return errorResponse(new AgentHarnessError('消息或附件格式无效'), traceId)

  const { messages, attachments } = parsed.data
  const textChars = messages.reduce((total, message) => total + message.content.length, 0)
  const attachmentChars = attachments.reduce((total, attachment) => total + attachment.content.length, 0)

  try {
    assertAgentInputWithinPolicy({
      agentName: AGENT_NAME,
      textChars,
      attachmentCount: attachments.length,
      attachmentChars,
    })
  } catch (error) {
    auditAgentRun({
      traceId,
      agentName: AGENT_NAME,
      action: 'chat',
      status: 'blocked',
      durationMs: Date.now() - startedAt,
      inputSize: textChars + attachmentChars,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return errorResponse(error, traceId)
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  const recentConversation = messages.slice(-10).map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.content || '（无文本内容）'}`).join('\n')
  const attachmentContext = attachments.length > 0
    ? `\n\n<untrusted_attachments>\n${attachments.map((item) => `<file name=${JSON.stringify(item.name)}>\n${item.content || '[非文本文件，仅提供文件名]'}\n</file>`).join('\n')}\n</untrusted_attachments>`
    : ''

  const knowledge = collectChatKnowledge([latestUserMessage, recentConversation].filter(Boolean).join('\n'))
  const prompt = [
    `最近用户问题：${latestUserMessage || '（仅附件，没有文本问题）'}`,
    `最近对话：\n${recentConversation || '无'}`,
    `本站可用事实：\n${knowledge.context}`,
    `用户附件：${attachmentContext || '无'}`,
    '请基于上述信息回答，若资料不足请保守说明。',
  ].join('\n\n')

  try {
    const { object } = await generateObject({
      model: getDeepSeekModel(),
      schema: ChatResponseSchema,
      system: SYSTEM_PROMPT,
      prompt,
      maxRetries: POLICY.maxRetries,
      maxTokens: 1_200,
      temperature: 0.2,
      abortSignal: createAgentAbortSignal(AGENT_NAME, req.signal),
    })

    const response = {
      answer: object.answer.trim(),
      sources: knowledge.sources,
      uncertainty: knowledge.uncertainty,
      nextStep: object.nextStep.trim(),
    }

    auditAgentRun({
      traceId,
      agentName: AGENT_NAME,
      action: 'chat',
      status: 'success',
      durationMs: Date.now() - startedAt,
      inputSize: textChars + attachmentChars,
      outputSize: JSON.stringify(response).length,
    })

    return Response.json({ ...response, agentType: AGENT_NAME, traceId, timestamp: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'no-store', 'X-Agent-Trace-Id': traceId },
    })
  } catch (error) {
    auditAgentRun({
      traceId,
      agentName: AGENT_NAME,
      action: 'chat',
      status: 'failed',
      durationMs: Date.now() - startedAt,
      inputSize: textChars + attachmentChars,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    return Response.json({ error: 'AI 服务暂时不可用，请稍后重试', traceId }, { status: 502 })
  }
}
