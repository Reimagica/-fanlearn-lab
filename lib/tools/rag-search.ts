/**
 * RAG 搜索工具 (QA Agent 专用)
 * Phase 3 接入向量数据库（Supabase pgvector 或 Pinecone）
 */

import { MOCK_MEMBERS, MOCK_PUBLICATIONS, LAB_INFO } from '@/lib/mock-data'

export interface RagResult {
  content: string
  source: string
  relevance: number
}

// Phase 1: 基于关键词的简单搜索
// Phase 3: 替换为向量相似度搜索
export async function ragSearch(query: string): Promise<RagResult[]> {
  const results: RagResult[] = []
  const q = query.toLowerCase()

  // 搜索成员信息
  for (const member of MOCK_MEMBERS) {
    const text = `${member.name} ${member.nameEn} ${member.bio} ${member.researchInterests.join(' ')}`
    if (text.toLowerCase().includes(q)) {
      results.push({
        content: `[成员] ${member.name} (${member.nameEn}): ${member.bio.slice(0, 200)}`,
        source: `team/${member.slug}`,
        relevance: 0.8,
      })
    }
  }

  // 搜索论文信息
  for (const paper of MOCK_PUBLICATIONS) {
    const text = `${paper.title} ${paper.abstract ?? ''} ${paper.tags?.join(' ') ?? ''}`
    if (text.toLowerCase().includes(q)) {
      results.push({
        content: `[论文] ${paper.title} (${paper.venue}, ${paper.year}): ${paper.abstract?.slice(0, 200) ?? ''}`,
        source: `publications`,
        relevance: 0.75,
      })
    }
  }

  // 搜索实验室信息
  if (q.includes('研究方向') || q.includes('实验室') || q.includes('课题组')) {
    results.push({
      content: `[实验室] ${LAB_INFO.name}: ${LAB_INFO.description} 研究方向：${LAB_INFO.researchInterests.join('、')}`,
      source: '/',
      relevance: 0.9,
    })
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5)
}
