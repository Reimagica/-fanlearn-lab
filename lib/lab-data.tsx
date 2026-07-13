'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MOCK_MEMBERS, MOCK_NEWS, MOCK_PUBLICATIONS } from '@/lib/mock-data'
import { findPaperMembers } from '@/lib/member-match'
import { isNewsCategory, normalizeNewsCategory } from '@/lib/news-category'
import { checkContentSafety } from '@/lib/tools/check-safety'
import type { Member, NewsItem, Publication, ReviewQueueItem } from '@/types'

interface OperationResult {
  ok: boolean
  error?: string
  reviewId?: string
}

interface LabDataContextValue {
  members: Member[]
  publications: Publication[]
  news: NewsItem[]
  reviews: ReviewQueueItem[]
  updateMember: (member: Member) => OperationResult
  addMember: (member: Member) => OperationResult
  removeMember: (slug: string) => void
  submitPublication: (paper: Publication, submitter: { slug: string; name: string }) => OperationResult
  submitPublications: (papers: Publication[], submitter: { slug: string; name: string }) => { submitted: number; skipped: number; errors: string[] }
  updatePublication: (paper: Publication) => OperationResult
  removePublication: (id: string) => OperationResult
  submitNews: (item: NewsItem, submitter: { slug: string; name: string }) => OperationResult
  approveReview: (id: string, reviewerSlug: string, note?: string) => void
  rejectReview: (id: string, reviewerSlug: string, note: string) => void
  pendingReviews: ReviewQueueItem[]
}

const MEMBERS_KEY = 'fl_members'
const PUBLICATIONS_KEY = 'fl_publications'
const NEWS_KEY = 'fl_news'
const REVIEWS_KEY = 'fl_review_queue'
const MEMBER_DATA_VERSION_KEY = 'fl_member_data_version'
const PUBLICATION_DATA_VERSION_KEY = 'fl_publication_data_version'
const NEWS_DATA_VERSION_KEY = 'fl_news_data_version'
const CONTENT_DATA_VERSION = '2026-07-13-news-harness-v4'
const MEMBER_DATA_VERSION = CONTENT_DATA_VERSION
const SEEDED_MEMBER_SLUGS = new Set([
  'ma-junyang',
  'member-a',
  'member-b',
  'member-c',
  'member-d',
  'member-e',
  'member-f',
  'li-xinyu',
  'ma-ling',
])

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function migrateMember(member: Member): Member {
  const legacy = member as Member & { role?: string }
  const category = legacy.category
    ?? (legacy.role === 'pi' ? 'advisor' : legacy.role === 'alumni' ? 'alumni' : 'researcher')
  const defaultTitle = category === 'advisor'
    ? '指导老师'
    : category === 'alumni'
      ? '毕业生'
      : '研究成员'

  return {
    ...legacy,
    category,
    title: legacy.title || defaultTitle,
    isAdmin: legacy.isAdmin ?? legacy.role === 'pi',
  }
}

function migrateNewsItem(item: NewsItem): NewsItem {
  return {
    ...item,
    category: normalizeNewsCategory(item.category),
    summary: item.summary || item.content?.trim().slice(0, 120) || '课题组动态',
    relatedMemberSlugs: item.relatedMemberSlugs?.length
      ? item.relatedMemberSlugs
      : item.memberSlug
        ? [item.memberSlug]
        : [],
  }
}

function readMembersWithMigrations(): Member[] {
  const members = readStored(MEMBERS_KEY, MOCK_MEMBERS).map(migrateMember)
  if (localStorage.getItem(MEMBER_DATA_VERSION_KEY) === MEMBER_DATA_VERSION) return members

  const migrated = [...members]
  for (const seedMember of MOCK_MEMBERS.filter((member) => SEEDED_MEMBER_SLUGS.has(member.slug))) {
    const existingIndex = migrated.findIndex(
      (member) => member.slug === seedMember.slug || member.name === seedMember.name,
    )
    if (existingIndex >= 0) {
      migrated[existingIndex] = {
        ...seedMember,
        ...migrated[existingIndex],
        slug: seedMember.slug,
        category: seedMember.category,
        title: seedMember.title,
        isActive: seedMember.isActive,
        isAdmin: seedMember.isAdmin,
      }
    } else {
      migrated.push(seedMember)
    }
  }
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(migrated))
  localStorage.setItem(MEMBER_DATA_VERSION_KEY, MEMBER_DATA_VERSION)
  return migrated
}

function readPublicationsWithMigrations(): Publication[] {
  const publications = readStored(PUBLICATIONS_KEY, MOCK_PUBLICATIONS)
  if (localStorage.getItem(PUBLICATION_DATA_VERSION_KEY) === CONTENT_DATA_VERSION) {
    return publications
  }

  const seeded = MOCK_PUBLICATIONS.filter((paper) => paper.id.startsWith('real_'))
  const seededIds = new Set(seeded.map((paper) => paper.id))
  const migrated = [
    ...publications.filter((paper) => !seededIds.has(paper.id)),
    ...seeded,
  ]
  localStorage.setItem(PUBLICATIONS_KEY, JSON.stringify(migrated))
  localStorage.setItem(PUBLICATION_DATA_VERSION_KEY, CONTENT_DATA_VERSION)
  return migrated
}

function readNewsWithMigrations(): NewsItem[] {
  const news = readStored(NEWS_KEY, MOCK_NEWS).map(migrateNewsItem)
  if (localStorage.getItem(NEWS_DATA_VERSION_KEY) === CONTENT_DATA_VERSION) return news

  const seededIds = new Set(MOCK_NEWS.map((item) => item.id))
  const migrated = [
    ...MOCK_NEWS.map(migrateNewsItem),
    ...news.filter((item) => !/^\d+$/.test(item.id) && !seededIds.has(item.id)),
  ]
  localStorage.setItem(NEWS_KEY, JSON.stringify(migrated))
  localStorage.setItem(NEWS_DATA_VERSION_KEY, CONTENT_DATA_VERSION)
  return migrated
}

function normalizedTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
}

function isDuplicatePaper(paper: Publication, existing: Publication[]) {
  const doi = paper.doi?.trim().toLowerCase()
  return existing.some((item) => {
    if (doi && item.doi?.trim().toLowerCase() === doi) return true
    return normalizedTitle(item.title) === normalizedTitle(paper.title)
  })
}

function createReview(
  contentType: ReviewQueueItem['contentType'],
  content: Publication | NewsItem,
  submitter: { slug: string; name: string },
): ReviewQueueItem {
  return {
    id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    contentType,
    content,
    submittedBy: submitter.slug,
    submitterName: submitter.name,
    humanReviewStatus: 'pending',
    createdAt: new Date().toISOString(),
  }
}

const LabDataContext = createContext<LabDataContextValue | null>(null)

export function LabDataProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS)
  const [publications, setPublications] = useState<Publication[]>(MOCK_PUBLICATIONS)
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS)
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMembers(readMembersWithMigrations())
      const legacyPapers = readStored<Publication[]>('fl_user_publications', [])
      const storedPapers = readPublicationsWithMigrations()
      const mergedPapers = [...storedPapers]
      for (const paper of legacyPapers) {
        if (!isDuplicatePaper(paper, mergedPapers)) mergedPapers.push({ ...paper, status: 'published' })
      }
      localStorage.setItem(PUBLICATIONS_KEY, JSON.stringify(mergedPapers))
      setPublications(mergedPapers)
      setNews(readNewsWithMigrations())
      setReviews(
        readStored<ReviewQueueItem[]>(REVIEWS_KEY, [])
          .filter((item) => item.content && item.humanReviewStatus)
          .map((item) => item.contentType === 'news'
            ? { ...item, content: migrateNewsItem(item.content as NewsItem) }
            : item),
      )
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const commitMembers = (next: Member[]) => {
    setMembers(next)
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(next))
  }

  const commitPublications = (next: Publication[]) => {
    setPublications(next)
    localStorage.setItem(PUBLICATIONS_KEY, JSON.stringify(next))
  }

  const commitNews = (next: NewsItem[]) => {
    setNews(next)
    localStorage.setItem(NEWS_KEY, JSON.stringify(next))
  }

  const commitReviews = (next: ReviewQueueItem[]) => {
    setReviews(next)
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(next))
  }

  const updateMember = (member: Member): OperationResult => {
    if (!members.some((item) => item.slug === member.slug)) return { ok: false, error: '成员不存在' }
    commitMembers(members.map((item) => item.slug === member.slug ? member : item))
    return { ok: true }
  }

  const addMember = (member: Member): OperationResult => {
    if (members.some((item) => item.slug === member.slug || item.email === member.email)) {
      return { ok: false, error: '成员 slug 或邮箱已存在' }
    }
    commitMembers([...members, member])
    return { ok: true }
  }

  const removeMember = (slug: string) => {
    commitMembers(members.filter((item) => item.slug !== slug))
  }

  const submitPublication = (
    paper: Publication,
    submitter: { slug: string; name: string },
  ): OperationResult => {
    const pendingPapers = reviews
      .filter((item) => item.contentType === 'publication' && item.humanReviewStatus === 'pending')
      .map((item) => item.content as Publication)
    if (isDuplicatePaper(paper, [...publications, ...pendingPapers])) {
      return { ok: false, error: '该论文已发布或正在审核，不可重复提交' }
    }
    // Never trust member slugs supplied by the client: submission eligibility must
    // be derived from the author list itself.
    const relatedMembers = findPaperMembers({ ...paper, relatedMemberSlugs: [] }, members)
    if (relatedMembers.length === 0) {
      return { ok: false, error: '论文作者中必须至少包含一位本课题组成员' }
    }
    const normalized: Publication = {
      ...paper,
      status: 'pending_review',
      relatedMemberSlugs: relatedMembers.map((member) => member.slug),
      createdAt: paper.createdAt || new Date().toISOString(),
    }
    const review = createReview('publication', normalized, submitter)
    commitReviews([review, ...reviews])
    return { ok: true, reviewId: review.id }
  }

  const submitPublications = (
    papers: Publication[],
    submitter: { slug: string; name: string },
  ) => {
    let submitted = 0
    let skipped = 0
    const errors: string[] = []
    let workingReviews = [...reviews]
    for (const paper of papers) {
      const pendingPapers = workingReviews
        .filter((item) => item.contentType === 'publication' && item.humanReviewStatus === 'pending')
        .map((item) => item.content as Publication)
      if (isDuplicatePaper(paper, [...publications, ...pendingPapers])) {
        skipped++
        errors.push(`《${paper.title}》已存在或正在审核`)
        continue
      }
      const relatedMembers = findPaperMembers({ ...paper, relatedMemberSlugs: [] }, members)
      if (relatedMembers.length === 0) {
        skipped++
        errors.push(`《${paper.title}》未匹配到课题组成员作者`)
        continue
      }
      const review = createReview('publication', {
        ...paper,
        status: 'pending_review',
        relatedMemberSlugs: relatedMembers.map((member) => member.slug),
      }, submitter)
      workingReviews = [review, ...workingReviews]
      submitted++
    }
    if (submitted > 0) commitReviews(workingReviews)
    return { submitted, skipped, errors }
  }

  const updatePublication = (paper: Publication): OperationResult => {
    if (!publications.some((item) => item.id === paper.id)) {
      return { ok: false, error: '论文不存在或已被删除' }
    }
    const otherPapers = publications.filter((item) => item.id !== paper.id)
    if (isDuplicatePaper(paper, otherPapers)) {
      return { ok: false, error: 'DOI 或论文标题与其他已发布论文重复' }
    }
    const relatedMembers = findPaperMembers({ ...paper, relatedMemberSlugs: [] }, members)
    if (relatedMembers.length === 0) {
      return { ok: false, error: '论文作者中必须至少包含一位本课题组成员' }
    }
    const normalized: Publication = {
      ...paper,
      citationCount: Math.max(0, Math.round(paper.citationCount || 0)),
      downloadCount: Math.max(0, Math.round(paper.downloadCount || 0)),
      status: 'published',
      relatedMemberSlugs: relatedMembers.map((member) => member.slug),
    }
    commitPublications(publications.map((item) => item.id === paper.id ? normalized : item))
    return { ok: true }
  }

  const removePublication = (id: string): OperationResult => {
    if (!publications.some((item) => item.id === id)) {
      return { ok: false, error: '论文不存在或已被删除' }
    }
    commitPublications(publications.filter((item) => item.id !== id))
    return { ok: true }
  }

  const submitNews = (item: NewsItem, submitter: { slug: string; name: string }): OperationResult => {
    if (!isNewsCategory(item.category)) return { ok: false, error: '动态类型无效' }
    if (!item.title.trim() || !item.summary.trim() || !item.content?.trim()) {
      return { ok: false, error: '标题、摘要和正文不能为空' }
    }
    if (item.title.length > 80 || item.summary.length > 120 || item.content.length > 3000) {
      return { ok: false, error: '动态内容超过长度上限，请精简后重试' }
    }
    const safety = checkContentSafety(`${item.title}\n${item.summary}\n${item.content}`)
    if (!safety.passed) {
      return { ok: false, error: `提交前检查未通过：${safety.issues.join('；')}` }
    }
    const relatedMemberSlugs = Array.from(new Set([
      ...(item.relatedMemberSlugs ?? []),
      submitter.slug,
    ]))
    const normalized: NewsItem = {
      ...item,
      memberSlug: submitter.slug,
      relatedMemberSlugs,
      authorName: submitter.name,
      status: 'pending_review',
      source: 'agent',
      createdAt: item.createdAt || new Date().toISOString(),
    }
    const review = createReview('news', normalized, submitter)
    commitReviews([review, ...reviews])
    return { ok: true, reviewId: review.id }
  }

  const approveReview = (id: string, reviewerSlug: string, note?: string) => {
    const review = reviews.find((item) => item.id === id)
    if (!review || review.humanReviewStatus !== 'pending') return
    if (review.contentType === 'publication') {
      const paper = { ...(review.content as Publication), status: 'published' as const }
      if (!isDuplicatePaper(paper, publications)) commitPublications([paper, ...publications])
    } else {
      const item = { ...(review.content as NewsItem), status: 'published' as const }
      if (!news.some((current) => current.id === item.id)) commitNews([item, ...news])
    }
    commitReviews(reviews.map((item) => item.id === id ? {
      ...item,
      humanReviewStatus: 'approved',
      reviewerId: reviewerSlug,
      reviewedAt: new Date().toISOString(),
      reviewNote: note,
    } : item))
  }

  const rejectReview = (id: string, reviewerSlug: string, note: string) => {
    commitReviews(reviews.map((item) => item.id === id ? {
      ...item,
      humanReviewStatus: 'rejected',
      reviewerId: reviewerSlug,
      reviewedAt: new Date().toISOString(),
      reviewNote: note,
    } : item))
  }

  const pendingReviews = useMemo(
    () => reviews.filter((item) => item.humanReviewStatus === 'pending'),
    [reviews],
  )

  const value: LabDataContextValue = {
    members,
    publications,
    news,
    reviews,
    updateMember,
    addMember,
    removeMember,
    submitPublication,
    submitPublications,
    updatePublication,
    removePublication,
    submitNews,
    approveReview,
    rejectReview,
    pendingReviews,
  }

  return <LabDataContext.Provider value={value}>{children}</LabDataContext.Provider>
}

export function useLabData() {
  const context = useContext(LabDataContext)
  if (!context) throw new Error('useLabData must be used within LabDataProvider')
  return context
}
