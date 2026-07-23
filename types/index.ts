export type MemberCategory = 'advisor' | 'researcher' | 'alumni'

export interface Member {
  id: string
  slug: string
  name: string
  nameEn: string
  category: MemberCategory
  title: string
  isAdmin?: boolean
  avatarUrl: string
  bio: string
  researchInterests: string[]
  email?: string
  googleScholarUrl?: string
  semanticScholarId?: string
  githubUrl?: string
  homepageUrl?: string
  hIndex?: number
  citationCount?: number
  joinYear: number
  graduateYear?: number
  isActive: boolean
  syncedAt?: string
  aliases?: string[]
}

export type PublicationType = 'conference' | 'journal' | 'preprint' | 'thesis' | 'book'

export type PublicationLookupConditionType = 'title' | 'author' | 'doi'

export interface PublicationLookupCondition {
  type: PublicationLookupConditionType
  value: string
}

export interface Publication {
  id: string
  title: string
  authors: string[]
  venue: string
  year: number
  doi?: string
  arxivId?: string
  pdfUrl?: string
  codeUrl?: string
  projectUrl?: string
  sourceUrl?: string
  language?: 'zh' | 'en' | 'other'
  abstract?: string
  pubType: PublicationType
  citationCount: number
  downloadCount?: number
  isHighlight: boolean
  status: 'published' | 'pending_review' | 'rejected'
  source: 'manual' | 'agent' | 'auto_crawler'
  relatedMemberSlugs: string[]
  tags?: string[]
  createdAt: string
}

export type NewsCategory = 'paper' | 'academic' | 'member'

export type PublicationLookupSource = 'semantic_scholar' | 'crossref' | 'dblp'

export type PublicationLookupField =
  | 'title'
  | 'authors'
  | 'doi'
  | 'venue'
  | 'year'
  | 'abstract'
  | 'pdfUrl'
  | 'sourceUrl'

export interface PublicationLookupCandidate {
  paper: Publication
  source: PublicationLookupSource
  confidence: number
  matchedFields: PublicationLookupField[]
  missingFields: PublicationLookupField[]
}

export type ChatSourceKind = 'member' | 'publication' | 'news' | 'guide' | 'lab_info'

export interface ChatSourceItem {
  kind: ChatSourceKind
  title: string
  url?: string
  slug?: string
  excerpt?: string
}

export type ChatUncertaintyLevel = 'low' | 'medium' | 'high'

export interface ChatUncertainty {
  level: ChatUncertaintyLevel
  notes: string[]
}

export interface ChatStructuredResponse {
  answer: string
  sources: ChatSourceItem[]
  uncertainty: ChatUncertainty
  nextStep: string
}

export interface NewsDraftStructuredResponse {
  title: string
  summary: string
  content: string
  factsUsed: string[]
  riskFlags: string[]
  needsReview: boolean
}

export interface NewsItem {
  id: string
  title: string
  summary: string
  content?: string
  category: NewsCategory
  memberSlug?: string
  relatedMemberSlugs?: string[]
  authorName?: string
  eventDate: string
  referenceLinks?: string[]
  attachments?: Array<{ name: string; type: string; size: number }>
  factsUsed?: string[]
  riskFlags?: string[]
  needsReview?: boolean
  status: 'published' | 'pending_review' | 'rejected'
  source: 'manual' | 'agent' | 'auto_crawler'
  createdAt: string
}

export type AgentType = 'orchestrator' | 'intake' | 'news_draft' | 'research' | 'moderation' | 'watchdog' | 'qa'

export interface AgentLog {
  id: string
  agentType: AgentType
  action: string
  inputData: Record<string, unknown>
  outputData: Record<string, unknown>
  toolsCalled: string[]
  status: 'success' | 'failed' | 'escalated'
  userId?: string
  durationMs: number
  createdAt: string
}

export interface ReviewQueueItem {
  id: string
  contentType: 'publication' | 'news'
  content: Publication | NewsItem
  submittedBy: string
  submitterName: string
  moderationResult?: {
    decision: 'approved' | 'rejected' | 'escalated'
    checks: Array<{ dimension: string; passed: boolean; detail: string }>
    reason: string
    suggestions?: string[]
  }
  humanReviewStatus: 'pending' | 'approved' | 'rejected'
  reviewerId?: string
  createdAt: string
  reviewedAt?: string
  reviewNote?: string
}

export interface AccountRecord {
  username: string
  password: string
  phone?: string
  memberSlug: string
  name: string
  isAdmin: boolean
  mustChangePassword?: boolean
}
