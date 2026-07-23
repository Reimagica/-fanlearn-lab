import { searchCrossrefWorks, fetchCrossrefWorkByDoi, type CrossrefWork } from '@/lib/tools/fetch-crossref'
import { searchDblp, type DBLPResult } from '@/lib/tools/fetch-dblp'
import { fetchPaperByDoi, searchPaper, type SSPaper } from '@/lib/tools/fetch-semantic-scholar'
import type {
  Publication,
  PublicationLookupCandidate,
  PublicationLookupCondition,
  PublicationLookupField,
  PublicationLookupSource,
  PublicationType,
} from '@/types'

const RESULT_LIMIT = 5
const MAX_CONDITIONS = 3
const MAX_AUTHOR_CONDITIONS = 3

type LookupSource = 'semantic_scholar' | 'crossref' | 'dblp'

interface LookupCandidate {
  paper: Publication
  source: LookupSource
}

export interface PublicationLookupInput {
  title?: string
  doi?: string
  authors?: string[]
  author?: string | string[]
  query?: string
}

export class PublicationLookupInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicationLookupInputError'
  }
}

interface LookupPlan {
  normalized: string
  searchText: string
  title?: string
  doi?: string
  authors: string[]
  conditions: PublicationLookupCondition[]
  searchTerms: string[]
}

interface SearchProfile {
  term: string
  title?: string
  authors: string[]
  mode: 'combined' | 'title' | 'author'
}

interface ConditionEvaluation {
  matchedFields: Set<PublicationLookupField>
  matchedConditions: PublicationLookupCondition[]
  score: number
  allMatched: boolean
}

export async function lookupPublicationMetadata(input: PublicationLookupInput): Promise<PublicationLookupCandidate[]> {
  const plan = normalizeLookupPlan(input)
  if (plan.conditions.length === 0) return []

  if (plan.doi) {
    const [ssPaper, crossrefPaper] = await Promise.all([
      fetchPaperByDoi(plan.doi).catch(() => null),
      fetchCrossrefWorkByDoi(plan.doi).catch(() => null),
    ])

    const exactCandidates = compactCandidates([
      ssPaper ? { paper: normalizeSemanticScholarPaper(ssPaper), source: 'semantic_scholar' as const } : null,
      crossrefPaper ? { paper: normalizeCrossrefWork(crossrefPaper), source: 'crossref' as const } : null,
    ])

    const mergedExact = mergeCandidates(exactCandidates, plan)
      .filter((candidate) => matchesLookupPlan(candidate.paper, plan))

    if (mergedExact.length > 0) {
      return mergedExact.slice(0, RESULT_LIMIT)
    }
  }

  const searchProfiles = buildSearchProfiles(plan)
  const allResults: LookupCandidate[] = []

  for (const profile of searchProfiles) {
    const sourceRequests = buildSourceRequests(profile, plan)
    const settled = await Promise.all(sourceRequests.map((request) => request.catch((error) => {
      console.error('[publication-lookup] source error:', error)
      return []
    })))
    allResults.push(...settled.flat())
  }

  return mergeCandidates(allResults, plan)
    .filter((candidate) => matchesLookupPlan(candidate.paper, plan))
    .slice(0, RESULT_LIMIT)
}

function normalizeLookupPlan(input: PublicationLookupInput): LookupPlan {
  const explicitTitle = sanitizeQueryText(input.title ?? '')
  const explicitDoi = normalizeDoi(input.doi ?? '')
  const explicitAuthors = normalizeAuthorInputs(input.authors, input.author)
  const legacyText = sanitizeQueryText(input.query ?? '')

  let title = explicitTitle
  let doi = explicitDoi
  let authors = explicitAuthors

  if (!title && !doi && authors.length === 0 && legacyText) {
    const parsedDoi = extractDoiCandidate(legacyText)
    const parsedTitle = firstNonEmpty(
      extractLabeledField(legacyText, ['标题', '题目', '论文题目', 'title']),
      extractQuotedTitle(legacyText),
      extractCitationTitle(legacyText),
    )
    const parsedAuthors = extractExplicitAuthorHints(legacyText, parsedTitle)

    if (parsedDoi) doi = parsedDoi
    if (parsedTitle) title = parsedTitle
    if (!title && !doi && parsedAuthors.length === 0) title = legacyText
    authors = parsedAuthors
  }

  const conditions: PublicationLookupCondition[] = []
  if (title) conditions.push({ type: 'title', value: title })
  if (doi) conditions.push({ type: 'doi', value: doi })
  for (const author of authors) conditions.push({ type: 'author', value: author })

  if (conditions.length === 0) {
    return {
      normalized: '',
      searchText: '',
      title: undefined,
      doi: undefined,
      authors: [],
      conditions: [],
      searchTerms: [],
    }
  }

  const titleCount = conditions.filter((condition) => condition.type === 'title').length
  const doiCount = conditions.filter((condition) => condition.type === 'doi').length
  const authorCount = conditions.filter((condition) => condition.type === 'author').length

  if (titleCount > 1) throw new PublicationLookupInputError('标题条件最多只能填写 1 条')
  if (doiCount > 1) throw new PublicationLookupInputError('DOI 条件最多只能填写 1 条')
  if (authorCount > MAX_AUTHOR_CONDITIONS) throw new PublicationLookupInputError('作者条件最多只能填写 3 条')
  if (conditions.length > MAX_CONDITIONS) throw new PublicationLookupInputError('最多只能设置 3 个检索条件')

  const normalized = sanitizeQueryText([title, doi, ...authors].filter(Boolean).join(' '))
  const searchText = buildSearchText(normalized || legacyText, title, authors)
  const searchTerms = buildSearchTerms(title, authors, doi || legacyText)

  return {
    normalized,
    searchText,
    title,
    doi,
    authors,
    conditions,
    searchTerms,
  }
}

function normalizeAuthorInputs(authors?: string[], author?: string | string[]) {
  const rawValues = [
    ...(authors ?? []),
    ...(Array.isArray(author) ? author : author ? [author] : []),
  ]

  const expanded = rawValues.flatMap((value) => splitAuthorTokens(sanitizeQueryText(value)))
  return Array.from(new Set(expanded.filter((token) => isLikelyAuthorToken(token))))
}

function buildSearchTerms(title: string | undefined, authors: string[], fallback: string) {
  const terms = new Set<string>()
  const combined = [title, ...authors].filter(Boolean).join(' ').trim()

  if (combined) terms.add(normalizeLookupText(combined))
  if (title) terms.add(normalizeLookupText(title))
  for (const author of authors) terms.add(normalizeLookupText(author))
  if (!title && authors.length > 1) terms.add(normalizeLookupText(authors.join(' ')))
  if (terms.size === 0 && fallback) terms.add(normalizeLookupText(fallback))
  if (fallback) terms.add(normalizeLookupText(fallback))

  return Array.from(terms).filter((term) => Boolean(term && term.trim()))
}

function buildSearchProfiles(plan: LookupPlan) {
  const profiles: SearchProfile[] = []
  const combined = [plan.title, ...plan.authors].filter(Boolean).join(' ').trim()

  if (combined) {
    profiles.push({ term: combined, title: plan.title, authors: plan.authors, mode: 'combined' })
  }
  if (plan.title) {
    profiles.push({ term: plan.title, title: plan.title, authors: plan.authors, mode: 'title' })
  }
  if (plan.authors.length > 1) {
    profiles.push({ term: plan.authors.join(' '), authors: plan.authors, mode: 'combined' })
  }
  for (const author of plan.authors) {
    profiles.push({ term: author, authors: [author], mode: 'author' })
  }

  if (plan.doi) {
    profiles.push({ term: plan.doi, title: plan.title, authors: plan.authors, mode: 'combined' })
  }

  if (profiles.length === 0 && plan.doi) {
    profiles.push({ term: plan.doi, authors: [], mode: 'combined' })
  }

  return dedupeProfiles(profiles)
}

function dedupeProfiles(profiles: SearchProfile[]) {
  const seen = new Set<string>()
  const result: SearchProfile[] = []
  for (const profile of profiles) {
    const key = `${profile.mode}|${normalizeLookupKey(profile.term)}|${profile.authors.map((author) => normalizeLookupKey(author)).join('|')}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(profile)
  }
  return result
}

function buildSourceRequests(profile: SearchProfile, plan: LookupPlan): Array<Promise<LookupCandidate[]>> {
  return [
    fetchSemanticScholarCandidates(profile.term),
    fetchCrossrefCandidates(profile.term, {
      title: profile.title ?? plan.title,
      authors: profile.authors.length > 0 ? profile.authors : plan.authors,
      bibliographic: profile.term,
    }),
    fetchDblpCandidates(profile.term),
  ]
}

async function fetchSemanticScholarCandidates(query: string): Promise<LookupCandidate[]> {
  const papers = await searchPaper(query)
  return papers.map((paper) => ({
    paper: normalizeSemanticScholarPaper(paper),
    source: 'semantic_scholar' as const,
  }))
}

async function fetchCrossrefCandidates(
  query: string,
  options: { title?: string; authors?: string[]; bibliographic?: string },
): Promise<LookupCandidate[]> {
  const works = await searchCrossrefWorks(query, {
    title: options.title,
    authors: options.authors,
    bibliographic: options.bibliographic,
  })
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

function matchesLookupPlan(paper: Publication, plan: LookupPlan) {
  return plan.conditions.every((condition) => matchesLookupCondition(paper, condition))
}

function matchesLookupCondition(paper: Publication, condition: PublicationLookupCondition) {
  if (condition.type === 'title') {
    return matchesTitleCondition(paper.title, condition.value)
  }
  if (condition.type === 'author') {
    return matchesAuthorCondition(paper.authors, condition.value)
  }
  return normalizeDoi(paper.doi ?? '') === normalizeDoi(condition.value)
}

function matchesTitleCondition(paperTitle: string, queryTitle: string) {
  const titleKey = normalizeLookupKey(paperTitle)
  const queryKey = normalizeLookupKey(queryTitle)
  if (!titleKey || !queryKey) return false
  if (titleKey === queryKey) return true
  if (titleKey.includes(queryKey) || queryKey.includes(titleKey)) return true
  return titleSimilarityScore(paperTitle, queryTitle) >= 12
}

function matchesAuthorCondition(authors: string[], queryAuthor: string) {
  const queryKey = normalizeLookupKey(queryAuthor)
  if (!queryKey) return false
  return authors.some((author) => {
    const authorKey = normalizeLookupKey(author)
    return authorKey === queryKey || authorKey.includes(queryKey) || queryKey.includes(authorKey)
  })
}

function evaluateLookupConditions(paper: Publication, plan: LookupPlan): ConditionEvaluation {
  const matchedFields = new Set<PublicationLookupField>()
  const matchedConditions: PublicationLookupCondition[] = []
  let score = 0

  for (const condition of plan.conditions) {
    if (condition.type === 'title') {
      const titleScore = scoreTitleCondition(paper.title, condition.value)
      if (titleScore > 0) {
        score += titleScore
        matchedFields.add('title')
        matchedConditions.push(condition)
      }
      continue
    }

    if (condition.type === 'author') {
      const authorScore = scoreAuthorCondition(paper.authors, condition.value)
      if (authorScore > 0) {
        score += authorScore
        matchedFields.add('authors')
        matchedConditions.push(condition)
      }
      continue
    }

    const doiMatched = normalizeDoi(paper.doi ?? '') === normalizeDoi(condition.value)
    if (doiMatched) {
      score += 120
      matchedFields.add('doi')
      matchedConditions.push(condition)
    }
  }

  const allMatched = matchedConditions.length === plan.conditions.length
  return { matchedFields, matchedConditions, score, allMatched }
}

function scorePublication(paper: Publication, plan: LookupPlan) {
  const evaluation = evaluateLookupConditions(paper, plan)
  let score = evaluation.score

  if (paper.doi) score += 8
  if (paper.arxivId) score += 4
  if (paper.pdfUrl) score += 2
  if (paper.abstract) score += Math.min(8, Math.floor(paper.abstract.length / 160))

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

  return { score, evaluation }
}

function scoreTitleCondition(paperTitle: string, queryTitle: string) {
  const titleKey = normalizeLookupKey(paperTitle)
  const queryKey = normalizeLookupKey(queryTitle)
  if (!titleKey || !queryKey) return 0
  if (titleKey === queryKey) return 120
  if (titleKey.includes(queryKey) || queryKey.includes(titleKey)) return 90
  const similarity = titleSimilarityScore(paperTitle, queryTitle)
  return similarity >= 12 ? 50 + similarity : 0
}

function scoreAuthorCondition(authors: string[], queryAuthor: string) {
  const queryKey = normalizeLookupKey(queryAuthor)
  if (!queryKey) return 0
  let best = 0
  for (const author of authors) {
    const authorKey = normalizeLookupKey(author)
    if (!authorKey) continue
    if (authorKey === queryKey) {
      best = Math.max(best, 36)
      continue
    }
    if (authorKey.includes(queryKey) || queryKey.includes(authorKey)) {
      best = Math.max(best, 24)
      continue
    }
    if (titleSimilarityScore(author, queryAuthor) >= 12) {
      best = Math.max(best, 18)
    }
  }
  return best
}

function mergeCandidates(candidates: LookupCandidate[], plan: LookupPlan): PublicationLookupCandidate[] {
  const merged: Array<PublicationLookupCandidate & {
    paper: Publication
    source: PublicationLookupSource
    score: number
  }> = []
  const doiIndex = new Map<string, number>()
  const titleIndex = new Map<string, number>()
  const queryKey = normalizeLookupKey(plan.searchText || plan.normalized || plan.title || plan.doi || '')

  for (const candidate of candidates) {
    const paper = candidate.paper
    const doiKey = normalizeDoi(paper.doi ?? '')
    const titleKey = normalizeLookupKey(paper.title)
    const matchedIndex = (doiKey ? doiIndex.get(doiKey) : undefined)
      ?? titleIndex.get(titleKey)
    const { score, evaluation } = scorePublication(paper, plan)
    const metadata = buildLookupCandidate(paper, candidate.source, plan, score, evaluation)

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
    const mergedEvaluation = evaluateLookupConditions(mergedPaper, plan)
    merged[matchedIndex] = {
      ...buildLookupCandidate(mergedPaper, preferredSource, plan, mergedScore, mergedEvaluation),
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

function buildLookupCandidate(
  paper: Publication,
  source: PublicationLookupSource,
  plan: LookupPlan,
  score: number,
  evaluation: ConditionEvaluation,
): Omit<PublicationLookupCandidate, 'paper'> {
  const missingFields: PublicationLookupField[] = []
  if (!paper.doi) missingFields.push('doi')
  if (!paper.venue) missingFields.push('venue')
  if (!paper.abstract) missingFields.push('abstract')
  if (!paper.pdfUrl) missingFields.push('pdfUrl')
  if (!paper.sourceUrl) missingFields.push('sourceUrl')
  if (paper.authors.length === 0) missingFields.push('authors')

  return {
    source,
    confidence: normalizeConfidence(score, evaluation, paper, plan),
    matchedFields: Array.from(evaluation.matchedFields),
    missingFields,
  }
}

function normalizeConfidence(score: number, evaluation: ConditionEvaluation, paper: Publication, plan: LookupPlan) {
  let confidence = 0.1 + (score / 220)
  if (evaluation.matchedFields.has('doi')) confidence += 0.15
  if (evaluation.matchedFields.has('title')) confidence += 0.1
  if (evaluation.matchedFields.has('authors')) confidence += 0.08
  if (plan.conditions.length > 0) confidence += (evaluation.matchedConditions.length / plan.conditions.length) * 0.12
  if (paper.authors.length === 0) confidence -= 0.08
  return Math.max(0.05, Math.min(0.99, Number(confidence.toFixed(2))))
}

function buildSearchText(raw: string, title: string | undefined, authors: string[]) {
  const fragments: string[] = []
  const cleanTitle = title ? sanitizeQueryText(title) : ''
  if (cleanTitle) fragments.push(cleanTitle)

  for (const author of authors.slice(0, 3)) {
    const cleanAuthor = sanitizeQueryText(author)
    if (cleanAuthor && !fragments.includes(cleanAuthor)) fragments.push(cleanAuthor)
  }

  if (fragments.length === 0) fragments.push(stripLookupNoise(raw))

  const combined = fragments.join(' ').replace(/\s+/g, ' ').trim()
  const fallback = stripLookupNoise(raw)
  return stripLookupNoise(combined || fallback || raw)
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDoiCandidate(text: string) {
  const match = text.match(/\b10\.\d{4,9}\/[\w.()/:;-]+\b/i)
  return match ? normalizeDoi(match[0]) : ''
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

  return Array.from(new Set(tokens))
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

function compactCandidates(items: Array<LookupCandidate | null | undefined>) {
  return items.filter((item): item is LookupCandidate => Boolean(item))
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

function tokenizeForSimilarity(text: string) {
  return normalizeLookupText(text)
    .toLowerCase()
    .split(/[^a-z0-9\u3400-\u9fff]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}
