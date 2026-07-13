import { MOCK_PUBLICATIONS } from '@/lib/mock-data'

const PUBLICATION_TYPES = ['conference', 'journal', 'preprint', 'thesis', 'book'] as const

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam === null ? null : Number(yearParam)
  const type = searchParams.get('type')
  const memberSlug = searchParams.get('member')
  const highlight = searchParams.get('highlight')

  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 2)) {
    return Response.json({ error: '年份参数无效' }, { status: 400 })
  }
  if (type && !PUBLICATION_TYPES.includes(type as typeof PUBLICATION_TYPES[number])) {
    return Response.json({ error: '论文类型无效' }, { status: 400 })
  }
  if (highlight && highlight !== 'true' && highlight !== 'false') {
    return Response.json({ error: 'highlight 参数仅支持 true 或 false' }, { status: 400 })
  }
  if (memberSlug && memberSlug.length > 100) {
    return Response.json({ error: '成员标识过长' }, { status: 400 })
  }

  let publications = [...MOCK_PUBLICATIONS]

  if (year) publications = publications.filter((p) => p.year === year)
  if (type) publications = publications.filter((p) => p.pubType === type)
  if (memberSlug) publications = publications.filter((p) => p.relatedMemberSlugs.includes(memberSlug))
  if (highlight === 'true') publications = publications.filter((p) => p.isHighlight)

  publications = publications.sort((a, b) => b.year - a.year)

  // Phase 2: 替换为 Sanity CMS 查询
  return Response.json({ publications, total: publications.length }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}

export async function POST() {
  // 当前 localStorage 原型无法在服务端持久化，也无法可靠验证登录身份。
  // 不返回伪造的 queueId；Phase 2 接入数据库和服务端认证后再开放此入口。
  return Response.json(
    { error: '当前阶段请登录后通过论文页面提交；服务端写入接口将在下一阶段开放' },
    { status: 501 },
  )
}
