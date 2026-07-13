import type { Publication, PublicationType } from '@/types'

/**
 * 轻量级 BibTeX 解析器（零依赖，花括号匹配）
 * 支持 @type{key, field = {value}, ...} 标准格式
 */

export interface BibParseResult {
  papers: Publication[]
  errors: string[]
}

export function parseBibtex(input: string): BibParseResult {
  const errors: string[] = []
  const papers: Publication[] = []

  // 提取所有 entry: @type{ ... }
  const entryRegex = /@(\w+)\s*\{/g
  let match: RegExpExecArray | null
  const entries: Array<{ type: string; start: number }> = []
  while ((match = entryRegex.exec(input)) !== null) {
    entries.push({ type: match[1].toLowerCase(), start: match.index + match[0].length })
  }

  for (const { type, start } of entries) {
    // 跳过注释类
    if (['comment', 'string', 'preamble'].includes(type)) continue

    const { content } = extractBalanced(input, start - 1)
    if (content == null) {
      errors.push(`解析失败：${type} 条目花括号不匹配`)
      continue
    }

    try {
      const paper = parseEntry(type, content)
      if (paper) papers.push(paper)
    } catch (e) {
      errors.push(`解析失败：${type} 条目 - ${e instanceof Error ? e.message : '未知错误'}`)
    }
  }

  return { papers, errors }
}

/** 从 { 处开始，匹配到对应的 }，返回内部内容（不含外层花括号） */
function extractBalanced(s: string, braceStart: number): { content: string | null; end: number } {
  if (s[braceStart] !== '{') return { content: null, end: braceStart }
  let depth = 1
  let i = braceStart + 1
  while (i < s.length && depth > 0) {
    if (s[i] === '{') depth++
    else if (s[i] === '}') depth--
    if (depth === 0) {
      return { content: s.slice(braceStart + 1, i), end: i }
    }
    i++
  }
  return { content: null, end: i }
}

function parseEntry(type: string, body: string): Publication | null {
  // body 形如: key, field1 = {val1}, field2 = {val2}, ...
  // 第一个逗号前是 citation key
  const firstComma = findTopLevelComma(body)
  if (firstComma === -1) return null

  const fieldsStr = body.slice(firstComma + 1)
  const fields = parseFields(fieldsStr)

  const title = cleanLatex(fields.title || '')
  const authorsRaw = fields.author || ''
  const authors = authorsRaw
    .split(/\s+and\s+/)
    .map((a) => cleanLatex(a).trim())
    .filter(Boolean)

  const year = parseInt(fields.year || '', 10) || new Date().getFullYear()
  const venue = cleanLatex(fields.journal || fields.booktitle || fields.publisher || '')
  const doi = cleanLatex(fields.doi || '')
  const arxivId = cleanLatex(fields.eprint || fields.archiveprefix?.includes('arxiv') ? fields.eprint || '' : '')
  const abstract = cleanLatex(fields.abstract || '')
  const pubType = inferType(type, fields)
  const url = cleanLatex(fields.url || '')

  if (!title) return null

  return {
    id: `bib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    authors: authors.length > 0 ? authors : ['Unknown'],
    venue,
    year,
    doi: doi || undefined,
    arxivId: arxivId || undefined,
    pdfUrl: /\.pdf(?:$|[?#])/i.test(url) ? url : undefined,
    sourceUrl: url || (doi ? `https://doi.org/${doi}` : undefined),
    language: /[\u3400-\u9fff]/.test(title) ? 'zh' : 'en',
    abstract: abstract || undefined,
    pubType,
    citationCount: 0,
    downloadCount: 0,
    isHighlight: false,
    status: 'pending_review',
    source: 'manual',
    relatedMemberSlugs: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }
}

/** 在顶层（depth=0）寻找下一个逗号 */
function findTopLevelComma(s: string): number {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === ',' && depth === 0) return i
  }
  return -1
}

/** 解析 "field = {value}, field2 = "value2", ..." */
function parseFields(s: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const regex = /(\w+)\s*=\s*/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(s)) !== null) {
    const fieldName = match[1].toLowerCase()
    const valueStart = match.index + match[0].length
    const value = extractValue(s, valueStart)
    if (value != null) {
      fields[fieldName] = value
      regex.lastIndex = valueStart + value.length + (s[valueStart + value.length] === ',' ? 1 : 0)
    } else {
      regex.lastIndex = valueStart + 1
    }
  }

  return fields
}

/** 从位置 i 开始提取一个值：{...} 或 "..." 或 bare token */
function extractValue(s: string, i: number): string | null {
  i = skipWhitespace(s, i)
  if (i >= s.length) return null
  if (s[i] === '{') {
    const { content } = extractBalanced(s, i)
    return content ?? null
  }
  if (s[i] === '"') {
    let j = i + 1
    let val = ''
    while (j < s.length && s[j] !== '"') {
      val += s[j]
      j++
    }
    return val
  }
  // bare value (number or string until comma)
  let j = i
  while (j < s.length && s[j] !== ',' && s[j] !== '}') j++
  return s.slice(i, j).trim()
}

function skipWhitespace(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++
  return i
}

/** 清理 LaTeX 转义、花括号包裹、多余空白 */
function cleanLatex(s: string): string {
  if (!s) return ''
  return s
    .replace(/[{}]/g, '')
    .replace(/\\&/g, '&')
    .replace(/\\[a-zA-Z]+/g, (m) => {
      // 常见 LaTeX 命令
      if (m === '\\&') return '&'
      if (m === '\\%') return '%'
      return ''
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function inferType(entryType: string, fields: Record<string, string>): PublicationType {
  const t = entryType.toLowerCase()
  if (t === 'book' || t === 'inbook') return 'book'
  if (t === 'phdthesis' || t === 'mastersthesis') return 'thesis'
  if (t === 'article') {
    // article 通常指期刊论文
    return 'journal'
  }
  if (t === 'inproceedings' || t === 'conference') {
    return 'conference'
  }
  if (t === 'misc' || t === 'techreport') {
    const j = (fields.journal || '').toLowerCase()
    if (j.includes('arxiv') || j.includes('preprint')) return 'preprint'
    return 'preprint'
  }
  return 'conference'
}
