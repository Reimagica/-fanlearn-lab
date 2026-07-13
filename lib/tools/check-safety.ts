/**
 * 内容安全检查工具 (Moderation Agent 专用)
 * Phase 4 接入内容安全服务或 DeepSeek 辅助审核
 */

export interface SafetyCheckResult {
  passed: boolean
  issues: string[]
  confidence: number
}

// 简单规则检查（Phase 1）
// Phase 4 替换为真实 AI 安全 API
export function checkContentSafety(content: string): SafetyCheckResult {
  const issues: string[] = []

  // PII 检测（手机号、身份证等）
  if (/\b1[3-9]\d{9}\b/.test(content)) issues.push('检测到可能的手机号')
  if (/\b(?:\d{15}|\d{17}[\dXx])\b/.test(content)) issues.push('检测到可能的身份证号')

  // 超长内容检查（可能是注入攻击）
  if (content.length > 10000) issues.push('内容过长，可能存在注入风险')

  return {
    passed: issues.length === 0,
    issues,
    confidence: 0.85,
  }
}

// DOI 验证：通过 CrossRef API 确认 DOI 真实存在
export async function verifyDoi(doi: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'FanLearnLab/1.0 (mailto:fanlearn@example.edu.cn)' },
    })
    return resp.ok
  } catch {
    return false
  }
}

// 重复检测（Phase 4 接入数据库）
export async function checkDuplicate(
  title: string,
  doi?: string,
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  void title
  void doi
  // Phase 4: 对比 Sanity CMS 已有内容
  // Phase 1: 始终返回不重复
  return { isDuplicate: false }
}
