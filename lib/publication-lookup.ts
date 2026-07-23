import { searchCrossrefWorks, fetchCrossrefWorkByDoi, type CrossrefWork } from '@/lib/tools/fetch-crossref'
import { searchDblp, type DBLPResult } from '@/lib/tools/fetch-dblp'
import { fetchPaperByDoi, searchPaper, type SSPaper } from '@/lib/tools/fetch-semantic-scholar'
import type {
  Publication,
  PublicationLookupCandidate,
  PublicationLookupField,
  PublicationLookupSource,
  PublicationType,
} from '@/types'

const RESULT_LIMIT = 5

type LookupSource = 'semantic_scholar' | 'crossref' | 'dblp'

interface LookupCandidate {
  paper: Publication
  source: LookupSource
}

export interface PublicationLookupInput {
  doi?: string
  query?: string
  author?: string
}

export async function lookupPublicationMetadata(input: PublicationLookupInput): Promise<PublicationLookupCandidate[]> {
  const normalizedDoi = normalizeDoi(input.doi ?? '')
  const rawQuery = normalizeLookupText(input.query ?? input.doi ?? '')
  const clues = parseLookupClues(rawQuery, input.author)

  if (!normalizedDoi && !rawQuery) {
    return []
  }

  if (normalizedDoi) {
    const [ssPaper, crossrefPaper] = await Promise.all([
      fetchPaperByDoi(normalizedDoi).catch(() => null),
      fetchCrossrefWorkByDoi(normalizedDoi).catch(() => null),
    ])

    const exactCandidates = compactCandidates([
      ssPaper ? { paper: normalizeSemanticScholarPaper(ssPaper), source: 'semantic_scholar' as const } : null,
      crossrefPaper ? { paper: normalizeCrossrefWork(crossrefPaper), source: 'crossref' as const } : null,
    ])

    const mergedExact = mergeCandidates(exactCandidates, rawQuery, clues)
    if (mergedExact.length > 0) {
      return mergedExact.slice(0, RESULT_LIMIT)
    }
  }

  const searchQueries = buildSearchQueries(clues)
  const allResults: LookupCandidate[] = []

  for (const query of searchQueries) {
    const sourceRequests = buildSourceRequests(query, clues)
    const settled = await Promise.all(sourceRequests.map((request) => request.catch((error) => {
      console.error('[publication-lookup] source error:', error)
      return []
    })))
    allResults.push(...settled.flat())
  }

  return mergeCandidates(allResults, clues.searchText || rawQuery, clues)
    .slice(0, RESULT_LIMIT)
}

function buildSearchQueries(clues: LookupClues) {
  const queries = [
    clues.searchText,
    clues.title,
    clues.normalized,
  ].filter((value): value is string => Boolean(value && value.trim()))

  return Array.from(new Set(queries.map((value) => normalizeLookupText(value)).filter(Boolean)))
}

function buildSourceRequests(query: string, clues: LookupClues): Array<Promise<LookupCandidate[]>> {
  const hasChinese = clues.hasChinese || containsCjk(query) || clues.sourceHints.cnki || clues.sourceHints.wanfang
  const preferBibliographic = hasChinese || clues.sourceHints.arxiv || clues.sourceHints.isbn || clues.sourceHints.cnki || clues.sourceHints.wanfang
  const shouldQueryDblp = !hasChinese && !clues.sourceHints.arxiv && !clues.sourceHints.isbn && /[a-zA-Z]/.test(query)
  const authorHint = clues.authorHints.join(' ').trim()

  return preferBibliographic
    ? [
        fetchCrossrefCandidates(query, authorHint),
        fetchSemanticScholarCandidates(query),
        shouldQueryDblp ? fetchDblpCandidates(query) : Promise.resolve([]),
      ]
    : [
        fetchSemanticScholarCandidates(query),
        fetchCrossrefCandidates(query, authorHint),
        shouldQueryDblp ? fetchDblpCandidates(query) : Promise.resolve([]),
      ]
}

async function fetchSemanticScholarCandidates(query: string): Promise<LookupCandidate[]> {
  const papers = await searchPaper(query)
  return papers.map((paper) => ({
    paper: normalizeSemanticScholarPaper(paper),
    source: 'semantic_scholar' as const,
  }))
}

async function fetchCrossrefCandidates(query: string, authorHint = ''): Promise<LookupCandidate[]> {
  const works = await searchCrossrefWorks(query, { author: authorHint })
  return works.map((work) => ({
    paper: normalizeCrossrefWork(work),
    source: 'crossref' as const,
  }))
}

async function fetchDblpCandidates(query: string): Promise<LookupCandidate[]> {
  const hits = await searchDblp(query)
  return hits.map((hit) => ({
    paper: normalizeDblpResult(hit),
    source: 'dblp' as const,
  }))
}

interface LookupClues {
  normalized: string
  searchText: string
  title?: string
  authorHints: string[]
  hasChinese: boolean
  sourceHints: {
    arxiv: boolean
    isbn: boolean
    cnki: boolean
    wanfang: boolean
  }
}

function parseLookupClues(rawQuery: string, fallbackAuthor?: string): LookupClues {
  const normalized = sanitizeQueryText(rawQuery)
  const title = firstNonEmpty(
    extractLabeledField(normalized, ['标题', '题目', '论文题目', 'title']),
    extractQuotedTitle(normalized),
    extractCitationTitle(normalized),
  )
  const explicitAuthorHints = extractExplicitAuthorHints(normalized, title)
  const fallbackAuthorText = fallbackAuthor ? sanitizeQueryText(fallbackAuthor) : ''
  const authorHints = explicitAuthorHints.length > 0
    ? explicitAuthorHints
    : fallbackAuthorText
      ? [fallbackAuthorText]
      : []
  const sourceHints = {
    arxiv: /\barxiv\b|arxiv:/i.test(normalized),
    isbn: /\bisbn\b/i.test(normalized),
    cnki: /cnki|知网|kns\.cnki/i.test(normalized),
    wanfang: /wanfang|万方/i.test(normalized),
  }

  return {
    normalized,
    searchText: buildSearchText(normalized, title, authorHints),
    title,
    authorHints,
    hasChinese: containsCjk(normalized) || containsCjk(title ?? ''),
    sourceHints,
  }
}

function buildSearchText(
  raw: string,
  title: string | undefined,
  authorHints: string[],
) {
  const fragments: string[] = []
  const cleanTitle = title ? sanitizeQueryText(title) : ''
  if (cleanTitle) fragments.push(cleanTitle)

  for (const author of authorHints.slice(0, 3)) {
    const cleanAuthor = sanitizeQueryText(author)
    if (cleanAuthor && !fragments.includes(cleanAuthor)) fragments.push(cleanAuthor)
  }

  if (fragments.length === 0) {
    fragments.push(stripLookupNoise(raw))
  }

  const combined = fragments.join(' ').replace(/\s+/g, ' ').trim()
  const fallback = stripLookupNoise(raw)
  const searchText = combined || fallback

  // 如果用户输入里混有 arXiv/ISBN/CNKI/万方等标记，把它们当作噪声去掉，
  // 但保留标题与作者，作为检索辅助线索。
  return stripLookupNoise(searchText || fallback || raw)
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLabeledField(text: string, labels: string[]) {
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const match = text.match(new RegExp(`(?:^|[\\s,，;；])${escaped}\\s*[:：]\\s*([^\\n;；]+)`, 'i'))
    if (match?.[1]) {
      const value = sanitizeQueryText(match[1])
      if (value) return value
    }
  }
  return undefined
}

function extractQuotedTitle(text: string) {
  const guillemet = text.match(/《([^》]{2,120})》/)
  if (guillemet?.[1]) return sanitizeQueryText(guillemet[1])

  const curly = text.match(/[“"']([^”"']{2,160})[”"']/)
  if (curly?.[1]) return sanitizeQueryText(curly[1])

  return undefined
}

function extractCitationTitle(text: string) {
  const segments = text
    .split(/(?:^|[。\.])\s*/)
    .map((segment) => sanitizeQueryText(segment))
    .filter(Boolean)

  if (segments.length >= 2) {
    const candidate = segments[1]
      .split(/\s*(?:\[[A-Z]{1,4}(?:\/[A-Z]{1,4})?\]|\(|（|：|:)/)[0]
      .trim()
    if (candidate.length >= 2) return candidate
  }

  return undefined
}

function extractExplicitAuthorHints(text: string, title?: string) {
  const labeled = extractLabeledField(text, ['作者', 'authors', 'author'])
  if (labeled) return splitAuthorTokens(labeled)

  const authorCue = /(?:\bby\b|\band\b|；|;|、|&|与|和)/i.test(text)
  if (!authorCue) return []

  const remainder = title
    ? text.replace(title, ' ')
    : text

  return splitAuthorTokens(remainder)
}

function splitAuthorTokens(value: string) {
  const tokens = value
    .split(/(?:[;；、,，&]| and | 与 | 和 |\n)+/i)
    .map((token) => sanitizeQueryText(token))
    .filter(Boolean)
    .filter((token) => isLikelyAuthorToken(token))

  return Array.from(new Set(tokens)).slice(0, 4)
}

function isLikelyAuthorToken(token: string) {
  if (!token) return false
  if (/[\u3400-\u9fff]/.test(token)) {
    return token.length >= 2 && token.length <= 8 && !/(标题|题目|论文|研究|关于|方法|系统|基于|分析)/.test(token)
  }
  if (/[A-Za-z]/.test(token)) {
    return token.length >= 3 && token.length <= 40
  }
  return false
}

function stripLookupNoise(text: string) {
  return sanitizeQueryText(text)
    .replace(/\b(arxiv|isbn|cnki|wanfang|知网|万方)\b[:：]?\s*[\w./()-]+/gi, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
}

function sanitizeQueryText(text: string) {
  return normalizeLookupText(text)
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value))
}

function mergeCandidates(candidates: LookupCandidate[], query: string, clues: LookupClues): PublicationLookupCandidate[] {
  const merged: Array<PublicationLookupCandidate & {
    paper: Publication
    source: PublicationLookupSource
    score: number
  }> = []
  const doiIndex = new Map<string, number>()
  const titleIndex = new Map<string, number>()
  const queryKey = normalizeLookupKey(query)

  for (const candidate of candidates) {
    const paper = candidate.paper
    const doiKey = normalizeDoi(paper.doi ?? '')
    const titleKey = normalizeLookupKey(paper.title)
    const matchedIndex = (doiKey ? doiIndex.get(doiKey) : undefined)
      ?? titleIndex.get(titleKey)
    const score = scorePublication(paper, clues)
    const metadata = buildLookupCandidate(paper, candidate.source, clues, score)

    if (matchedIndex === undefined) {
      const nextIndex = merged.length
      merged.push({
        ...metadata,
        paper,
        source: candidate.source,
        score,
      })
      if (doiKey) doiIndex.set(doiKey, nextIndex)
      titleIndex.set(titleKey, nextIndex)
      continue
    }

    const existing = merged[matchedIndex]
    const mergedPaper = mergePublication(existing.paper, paper, queryKey)
    const mergedScore = Math.max(existing.score, score)
    const preferredSource = score >= existing.score ? candidate.source : existing.source
    merged[matchedIndex] = {
      ...buildLookupCandidate(mergedPaper, preferredSource, clues, mergedScore),
      paper: mergedPaper,
      source: preferredSource,
      score: mergedScore,
    }
    if (doiKey) doiIndex.set(doiKey, matchedIndex)
    titleIndex.set(titleKey, matchedIndex)
  }

  return merged
    .map(({ paper, source, confidence, matchedFields, missingFields }) => ({
      paper,
      source,
      confidence,
      matchedFields,
      missingFields,
    }))
    .sort((a, b) => b.confidence - a.confidence)
}

function scorePublication(paper: Publication, clues: LookupClues) {
  const titleTarget = normalizeLookupKey(clues.title ?? clues.searchText ?? clues.normalized)
  const paperTitle = normalizeLookupKey(paper.title)
  const authorText = normalizeLookupKey(paper.authors.join(' '))

  let score = 0

  if (titleTarget) {
    if (paperTitle === titleTarget) score += 120
    else if (paperTitle.includes(titleTarget) || titleTarget.includes(paperTitle)) score += 90
    else score += titleSimilarityScore(paper.title, clues.title ?? clues.searchText ?? clues.normalized)
  }

  if (clues.authorHints.length > 0) {
    score += authorMatchScore(authorText, paper.authors, clues.authorHints)
  }

  if (paper.doi) score += 8
  if (paper.arxivId) score += 4
  if (paper.pdfUrl) score += 2
  if (paper.abstract) score += Math.min(8, Math.floor(paper.abstract.length / 160))
  if (clues.hasChinese && containsCjk(paper.title)) score += 6

  switch (paper.source) {
    case 'manual':
      score += 1
      break
    case 'agent':
      score += 2
      break
    case 'auto_crawler':
      score += 3
      break
  }

  return score
}

function buildLookupCandidate(
  paper: Publication,
  source: PublicationLookupSource,
  clues: LookupClues,
  score: number,
): Omit<PublicationLookupCandidate, 'paper'> {
  const matchedFields = new Set<PublicationLookupField>()
  const targetTitle = normalizeLookupKey(clues.title ?? clues.searchText ?? clues.normalized)
  const paperTitle = normalizeLookupKey(paper.title)
  const authorHints = clues.authorHints.map((value) => normalizeLookupKey(value)).filter(Boolean)
  const paperAuthors = paper.authors.map((value) => normalizeLookupKey(value))
  const queryHasDoi = /\b10\.\d{4,9}\/[\w.()/:;-]+\b/i.test(clues.normalized) || /\bdoi\b/i.test(clues.normalized)

  if (targetTitle && (paperTitle === targetTitle || paperTitle.includes(targetTitle) || targetTitle.includes(paperTitle) || titleSimilarityScore(paper.title, clues.title ?? clues.searchText ?? clues.normalized) > 0)) {
    matchedFields.add('title')
  }
  if (authorHints.length > 0 && authorMatchScore(normalizeLookupKey(paper.authors.join(' ')), paper.authors, clues.authorHints) > 0) {
    matchedFields.add('authors')
  }
  if (queryHasDoi && paper.doi) {
    matchedFields.add('doi')
  }
  if (paper.venue && normalizeLookupKey(clues.searchText).includes(normalizeLookupKey(paper.venue))) {
    matchedFields.add('venue')
  }
  if (paper.year && new RegExp(`\\b${paper.year}\\b`).test(clues.normalized)) {
    matchedFields.add('year')
  }

  const missingFields: PublicationLookupField[] = []
  if (!paper.doi) missingFields.push('doi')
  if (!paper.venue) missingFields.push('venue')
  if (!paper.abstract) missingFields.push('abstract')
  if (!paper.pdfUrl) missingFields.push('pdfUrl')
  if (!paper.sourceUrl) missingFields.push('sourceUrl')
  if (paper.authors.length === 0) missingFields.push('authors')

  return {
    source,
    confidence: normalizeConfidence(score, matchedFields, paper, clues, paperAuthors),
    matchedFields: Array.from(matchedFields),
    missingFields,
  }
}

function normalizeConfidence(
  score: number,
  matchedFields: Set<PublicationLookupField>,
  paper: Publication,
  clues: LookupClues,
  paperAuthors: string[],
) {
  let confidence = 0.15 + (score / 160)
  if (matchedFields.has('doi')) confidence += 0.1
  if (matchedFields.has('title')) confidence += 0.08
  if (matchedFields.has('authors')) confidence += 0.06
  if (paper.doi && clues.sourceHints.arxiv) confidence += 0.02
  if (paperAuthors.length === 0) confidence -= 0.08
  if (clues.hasChinese && containsCjk(paper.title)) confidence += 0.04
  return Math.max(0.05, Math.min(0.99, Number(confidence.toFixed(2))))
}

function titleSimilarityScore(title: string, query: string) {
  const titleKey = normalizeLookupKey(title)
  const queryKey = normalizeLookupKey(query)
  if (!titleKey || !queryKey) return 0

  if (titleKey.includes(queryKey) || queryKey.includes(titleKey)) {
    return Math.min(80, Math.max(titleKey.length, queryKey.length))
  }

  const titleTokens = tokenizeForSimilarity(title)
  const queryTokens = tokenizeForSimilarity(query)
  if (titleTokens.length === 0 || queryTokens.length === 0) return 0

  const titleSet = new Set(titleTokens)
  let hits = 0
  for (const token of queryTokens) {
    if (titleSet.has(token)) hits += 1
  }
  return Math.min(30, Math.round((hits / queryTokens.length) * 30))
}

function authorMatchScore(authorText: string, authors: string[], hints: string[]) {
  let hits = 0
  for (const hint of hints) {
    const key = normalizeLookupKey(hint)
    if (!key) continue
    if (authorText.includes(key)) {
      hits += 1
      continue
    }
    if (authors.some((author) => normalizeLookupKey(author).includes(key) || key.includes(normalizeLookupKey(author)))) {
      hits += 1
    }
  }
  return hits * 18
}

function tokenizeForSimilarity(text: string) {
  return normalizeLookupText(text)
    .toLowerCase()
    .split(/[^a-z0-9\u3400-\u9fff]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function mergePublication(base: Publication, incoming: Publication, queryKey: string): Publication {
  const baseTitleKey = normalizeLookupKey(base.title)
  const incomingTitleKey = normalizeLookupKey(incoming.title)
  const baseAbstract = base.abstract?.trim() ?? ''
  const incomingAbstract = incoming.abstract?.trim() ?? ''
  const preferIncomingText = incomingTitleKey === queryKey && baseTitleKey !== queryKey

  return {
    ...base,
    title: preferIncomingText && incoming.title ? incoming.title : base.title || incoming.title,
    authors: base.authors.length >= incoming.authors.length ? base.authors : incoming.authors,
    venue: base.venue || incoming.venue,
    year: base.year || incoming.year,
    doi: base.doi || incoming.doi,
    arxivId: base.arxivId || incoming.arxivId,
    pdfUrl: base.pdfUrl || incoming.pdfUrl,
    codeUrl: base.codeUrl || incoming.codeUrl,
    projectUrl: base.projectUrl || incoming.projectUrl,
    sourceUrl: base.sourceUrl || incoming.sourceUrl,
    language: base.language || incoming.language,
    abstract: incomingAbstract.length > baseAbstract.length ? incoming.abstract : base.abstract || incoming.abstract,
    pubType: choosePublicationType(base.pubType, incoming.pubType),
    citationCount: Math.max(base.citationCount || 0, incoming.citationCount || 0),
    downloadCount: Math.max(base.downloadCount || 0, incoming.downloadCount || 0),
    isHighlight: base.isHighlight || incoming.isHighlight,
    tags: mergeTags(base.tags, incoming.tags),
    status: base.status,
    source: base.source,
    relatedMemberSlugs: Array.from(new Set([...(base.relatedMemberSlugs ?? []), ...(incoming.relatedMemberSlugs ?? [])])),
  }
}

function mergeTags(baseTags?: string[], incomingTags?: string[]) {
  const tags = new Set<string>()
  for (const tag of [...(baseTags ?? []), ...(incomingTags ?? [])]) {
    const normalized = tag.trim()
    if (normalized) tags.add(normalized)
  }
  return tags.size > 0 ? Array.from(tags) : undefined
}

function choosePublicationType(base: PublicationType, incoming: PublicationType): PublicationType {
  const weights: Record<PublicationType, number> = {
    thesis: 5,
    book: 4,
    journal: 3,
    conference: 3,
    preprint: 1,
  }
  return weights[incoming] > weights[base] ? incoming : base
}

function normalizeSemanticScholarPaper(paper: SSPaper): Publication {
  const doi = normalizeDoi(paper.doi || paper.externalIds?.DOI || '')
  const arxivId = paper.externalIds?.ArXiv
  const venue = paper.venue || ''
  const year = paper.year || new Date().getFullYear()
  const title = paper.title?.trim() || 'Untitled'
  const pdfUrl = paper.openAccessPdf?.url
  const sourceUrl = doi
    ? `https://doi.org/${doi}`
    : arxivId
      ? `https://arxiv.org/abs/${arxivId}`
      : pdfUrl
        ? pdfUrl
        : undefined

  return {
    id: `ss_${paper.paperId}`,
    title,
    authors: paper.authors.map((author) => author.name).filter(Boolean),
    venue,
    year,
    doi: doi || undefined,
    arxivId,
    pdfUrl,
    sourceUrl,
    language: detectLanguage(title, paper.abstract),
    abstract: paper.abstract?.trim() || undefined,
    pubType: inferPubTypeFromVenue(venue),
    citationCount: paper.citationCount || 0,
    downloadCount: 0,
    isHighlight: false,
    status: 'pending_review',
    source: 'agent',
    relatedMemberSlugs: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }
}

function normalizeCrossrefWork(work: CrossrefWork): Publication {
  const title = firstText(work.title) || 'Untitled'
  const doi = normalizeDoi(work.DOI ?? '')
  const venue = firstText(work['container-title']) || firstText(work['short-container-title']) || work.publisher || work.event?.name || ''
  const year = extractYear(work) || new Date().getFullYear()
  const pdfUrl = firstPdfUrl(work)
  const sourceUrl = doi
    ? `https://doi.org/${doi}`
    : work.URL || pdfUrl
  const abstract = cleanAbstract(work.abstract)
  const authors = (work.author ?? []).map(formatCrossrefAuthor).filter(Boolean)

  return {
    id: makeStableId('crossref', doi || `${title}-${year}-${venue}`),
    title,
    authors,
    venue,
    year,
    doi: doi || undefined,
    pdfUrl,
    sourceUrl,
    language: detectLanguage(title, abstract, work.language),
    abstract,
    pubType: inferPubTypeFromCrossref(work),
    citationCount: work['is-referenced-by-count'] || 0,
    downloadCount: 0,
    isHighlight: false,
    status: 'pending_review',
    source: 'agent',
    relatedMemberSlugs: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }
}

function normalizeDblpResult(hit: DBLPResult): Publication {
  const title = cleanText(hit.info.title) || 'Untitled'
  const authors = normalizeDblpAuthors(hit.info.authors?.author)
  const doi = normalizeDoi(hit.info.doi ?? '')
  const venue = cleanText(hit.info.venue)
  const year = Number.parseInt(hit.info.year, 10) || new Date().getFullYear()
  const sourceUrl = doi ? `https://doi.org/${doi}` : hit.info.url

  return {
    id: makeStableId('dblp', doi || `${title}-${year}-${venue}`),
    title,
    authors,
    venue,
    year,
    doi: doi || undefined,
    sourceUrl,
    language: detectLanguage(title),
    abstract: undefined,
    pubType: inferPubTypeFromVenue(venue || title),
    citationCount: 0,
    downloadCount: 0,
    isHighlight: false,
    status: 'pending_review',
    source: 'agent',
    relatedMemberSlugs: [],
    tags: [],
    createdAt: new Date().toISOString(),
  }
}

function inferPubTypeFromVenue(venue: string): PublicationType {
  const v = venue.toLowerCase()
  if (!v) return 'preprint'
  if (v.includes('thesis') || v.includes('dissertation') || v.includes('学位')) return 'thesis'
  if (v.includes('arxiv') || v.includes('preprint') || v.includes('预印本')) return 'preprint'
  if (v.includes('book') || v.includes('press') || v.includes('出版社')) return 'book'
  const confKeywords = ['proceedings', 'conference', 'workshop', 'symposium', 'icml', 'iclr', 'acl', 'emnlp', 'cvpr', 'aied', 'lak', 'edm', '会议', '大会', '研讨会']
  if (confKeywords.some((keyword) => v.includes(keyword))) return 'conference'
  return 'journal'
}

function inferPubTypeFromCrossref(work: CrossrefWork): PublicationType {
  const type = (work.type ?? '').toLowerCase()
  const venue = [
    firstText(work['container-title']),
    firstText(work['short-container-title']),
    work.publisher,
    work.event?.name,
  ].filter(Boolean).join(' ').toLowerCase()

  if (type.includes('thesis') || type.includes('dissertation')) return 'thesis'
  if (type.includes('preprint') || type.includes('posted-content')) return 'preprint'
  if (type.includes('book')) {
    if (venue.includes('proceedings') || venue.includes('conference') || venue.includes('workshop') || venue.includes('symposium')) {
      return 'conference'
    }
    return 'book'
  }
  if (
    type.includes('proceedings')
    || type.includes('conference')
    || type.includes('book-chapter')
    || type.includes('book-section')
    || type.includes('reference-entry')
  ) {
    if (venue.includes('journal') || venue.includes('transactions') || venue.includes('letters')) {
      return 'journal'
    }
    return 'conference'
  }
  if (type.includes('journal')) return 'journal'

  if (venue.includes('proceedings') || venue.includes('conference') || venue.includes('workshop') || venue.includes('symposium')) {
    return 'conference'
  }
  if (venue.includes('journal') || venue.includes('transactions') || venue.includes('letters')) {
    return 'journal'
  }
  return 'journal'
}

function detectLanguage(...values: Array<string | undefined>) {
  const text = values.filter(Boolean).join(' ')
  if (/[\u3400-\u9fff]/.test(text)) return 'zh'
  if (/\bthe\b|\bof\b|\band\b/i.test(text)) return 'en'
  return 'other'
}

function normalizeDblpAuthors(authorField: string | string[] | undefined) {
  if (!authorField) return []
  const values = Array.isArray(authorField) ? authorField : [authorField]
  return values.map((value) => cleanText(value)).filter(Boolean)
}

function formatCrossrefAuthor(author: NonNullable<CrossrefWork['author']>[number]) {
  if (author.name) return cleanText(author.name)
  const given = cleanText(author.given ?? '')
  const family = cleanText(author.family ?? '')
  return [given, family].filter(Boolean).join(' ').trim()
}

function extractYear(work: CrossrefWork) {
  const sources = [work.issued, work['published-print'], work['published-online'], work.created]
  for (const source of sources) {
    const year = source?.['date-parts']?.[0]?.[0]
    if (typeof year === 'number' && Number.isFinite(year)) return year
  }
  return undefined
}

function firstPdfUrl(work: CrossrefWork) {
  return work.link?.find((link) => {
    const contentType = link['content-type'] ?? ''
    const intendedApplication = link['intended-application'] ?? ''
    return /pdf/i.test(contentType) || /pdf/i.test(intendedApplication)
  })?.URL
}

function cleanAbstract(value?: string) {
  if (!value) return undefined
  return cleanText(
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\''),
  ) || undefined
}

function firstText(values?: string[]) {
  return cleanText(values?.find(Boolean) ?? '')
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeLookupText(value: string) {
  return cleanText(value)
    .replace(/^《+|》+$/g, '')
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
}

function normalizeLookupKey(value: string) {
  return normalizeLookupText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]/g, '')
}

function normalizeDoi(value: string) {
  return cleanText(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/^urn:doi:/i, '')
}

function makeStableId(source: string, value: string) {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index)
  }
  return `${source}_${(hash >>> 0).toString(36)}`
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value)
}

function compactCandidates(items: Array<LookupCandidate | null | undefined>) {
  return items.filter((item): item is LookupCandidate => Boolean(item))
}
