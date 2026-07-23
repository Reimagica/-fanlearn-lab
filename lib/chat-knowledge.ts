import { LAB_INFO, MOCK_MEMBERS, MOCK_NEWS, MOCK_PUBLICATIONS } from '@/lib/mock-data'
import type { ChatSourceItem, ChatUncertainty } from '@/types'

const GUIDE_SOURCES: ChatSourceItem[] = [
  {
    kind: 'guide',
    title: '论文提交入口 /publications',
    url: '/publications',
    excerpt: '登录成员可通过自动查询、手动录入或 BibTeX 导入提交论文，之后进入管理员审核。',
  },
  {
    kind: 'guide',
    title: '动态发布入口 /news/new',
    url: '/news/new',
    excerpt: '成员可选择论文发表、学术动态、成员动态三类，AI 起草后预览并提交审核。',
  },
  {
    kind: 'guide',
    title: '账号管理 /account',
    url: '/account',
    excerpt: '用于修改手机号与密码等个人账户信息。',
  },
  {
    kind: 'guide',
    title: '团队主页 /team',
    url: '/team',
    excerpt: '查看指导老师、研究成员与毕业生，并编辑个人基础信息。',
  },
]

export function collectChatKnowledge(query: string): {
  sources: ChatSourceItem[]
  context: string
  uncertainty: ChatUncertainty
} {
  const normalized = normalize(query)
  const sources: ChatSourceItem[] = []

  sources.push({
    kind: 'lab_info',
    title: LAB_INFO.nameCn,
    excerpt: `${LAB_INFO.university}｜研究方向：${LAB_INFO.researchInterests.join('、')}`,
  })

  if (isMemberQuery(normalized)) {
    for (const member of findMembers(normalized)) {
      sources.push({
        kind: 'member',
        title: member.name,
        slug: member.slug,
        url: `/team/${member.slug}`,
        excerpt: member.bio?.slice(0, 120) || member.researchInterests.slice(0, 2).join('、'),
      })
    }
  }

  if (isPublicationQuery(normalized)) {
    for (const paper of findPublications(normalized)) {
      sources.push({
        kind: 'publication',
        title: paper.title,
        url: `/publications/${paper.id}`,
        excerpt: `${paper.venue || '未知来源'} · ${paper.year}｜${paper.authors.slice(0, 3).join('、')}`,
      })
    }
  }

  if (isNewsQuery(normalized)) {
    for (const news of findNews(normalized)) {
      sources.push({
        kind: 'news',
        title: news.title,
        url: `/news/${news.id}`,
        excerpt: `${news.eventDate} · ${news.summary}`,
      })
    }
  }

  for (const guide of findGuideSources(normalized)) {
    sources.push(guide)
  }

  const deduped = dedupeSources(sources).slice(0, 8)
  const uncertainty = buildUncertainty(deduped, normalized)
  return {
    sources: deduped,
    context: buildContext(deduped),
    uncertainty,
  }
}

function findMembers(query: string) {
  return MOCK_MEMBERS.filter((member) => {
    const haystack = normalize([
      member.name,
      member.nameEn,
      member.title,
      member.bio,
      ...(member.aliases ?? []),
      ...member.researchInterests,
    ].join(' '))
    return query.length === 0
      || haystack.includes(query)
      || query.split(/\s+/).some((token) => token && haystack.includes(token))
  }).slice(0, 4)
}

function findPublications(query: string) {
  return MOCK_PUBLICATIONS.filter((paper) => {
    const haystack = normalize([
      paper.title,
      paper.venue,
      paper.abstract ?? '',
      paper.authors.join(' '),
      ...(paper.tags ?? []),
    ].join(' '))
    return query.length === 0
      || haystack.includes(query)
      || query.split(/\s+/).some((token) => token && haystack.includes(token))
  }).slice(0, 4)
}

function findNews(query: string) {
  return MOCK_NEWS.filter((news) => {
    const haystack = normalize([
      news.title,
      news.summary,
      news.content ?? '',
      news.authorName ?? '',
      news.eventDate,
      news.category,
    ].join(' '))
    return query.length === 0
      || haystack.includes(query)
      || query.split(/\s+/).some((token) => token && haystack.includes(token))
  }).slice(0, 4)
}

function findGuideSources(query: string) {
  if (!query) return GUIDE_SOURCES.slice(0, 2)
  const matched: ChatSourceItem[] = []
  if (/论文|投稿|提交|发表|publication|paper/i.test(query)) {
    matched.push(GUIDE_SOURCES[0])
  }
  if (/动态|新闻|发布|news|activity/i.test(query)) {
    matched.push(GUIDE_SOURCES[1])
  }
  if (/账号|密码|手机号|账户|profile|login/i.test(query)) {
    matched.push(GUIDE_SOURCES[2])
  }
  if (/成员|团队|老师|研究员|member|team/i.test(query)) {
    matched.push(GUIDE_SOURCES[3])
  }
  return matched.length > 0 ? matched : GUIDE_SOURCES.slice(0, 2)
}

function buildContext(sources: ChatSourceItem[]) {
  if (sources.length === 0) {
    return '本站本地数据中没有找到直接匹配的事实。'
  }
  return sources
    .map((source, index) => `${index + 1}. [${source.kind}] ${source.title}${source.excerpt ? ` — ${source.excerpt}` : ''}`)
    .join('\n')
}

function buildUncertainty(sources: ChatSourceItem[], query: string): ChatUncertainty {
  const signalSources = sources.filter((source) => source.kind !== 'lab_info' && source.kind !== 'guide')
  if (signalSources.length === 0 && sources.length === 0) {
    return {
      level: 'high',
      notes: ['本地知识库里没有找到直接匹配的事实，需要进一步确认或补充线索。'],
    }
  }

  const notes: string[] = []
  if (signalSources.length === 0) {
    notes.push('当前主要依赖站点通用说明，缺少更具体的成员、论文或动态证据。')
  } else if (signalSources.length <= 1) {
    notes.push('可用证据较少，回答时应保持保守。')
  }
  if (/最近|最新|刚刚|今天/.test(query) && !sources.some((source) => source.kind === 'news')) {
    notes.push('问题带有时间敏感性，但当前未检索到明确的最新动态。')
  }
  if (/论文|发表|publication|paper/i.test(query) && !sources.some((source) => source.kind === 'publication')) {
    notes.push('问题涉及论文，但当前没有命中明确的论文记录。')
  }

  const level: ChatUncertainty['level'] = signalSources.length === 0
    ? 'medium'
    : notes.length > 1
      ? 'medium'
      : 'low'
  return {
    level,
    notes: notes.length > 0 ? notes : ['当前回答可以直接依赖本地知识库。'],
  }
}

function dedupeSources(sources: ChatSourceItem[]) {
  const seen = new Set<string>()
  const result: ChatSourceItem[] = []
  for (const source of sources) {
    const key = `${source.kind}:${source.title}:${source.url ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(source)
  }
  return result
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isMemberQuery(query: string) {
  return /成员|老师|研究员|团队|advisor|member|faculty|student|博士|硕士|毕业/.test(query)
}

function isPublicationQuery(query: string) {
  return /论文|发表|publication|paper|bibtex|doi|arxiv/.test(query)
}

function isNewsQuery(query: string) {
  return /动态|新闻|发布|news|activity|会议|毕业|加入|获奖/.test(query)
}
