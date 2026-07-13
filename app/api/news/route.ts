import { MOCK_NEWS } from '@/lib/mock-data'
import { isNewsCategory } from '@/lib/news-category'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoryParam = searchParams.get('category')
  if (categoryParam && !isNewsCategory(categoryParam)) {
    return Response.json({ error: '动态类型无效' }, { status: 400 })
  }
  const category = categoryParam && isNewsCategory(categoryParam) ? categoryParam : null
  const memberSlug = searchParams.get('member')
  const limitParam = searchParams.get('limit')
  const parsedLimit = limitParam === null ? null : Number(limitParam)
  if (parsedLimit !== null && (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
    return Response.json({ error: 'limit 参数必须是 1—100 的整数' }, { status: 400 })
  }
  if (memberSlug && memberSlug.length > 100) {
    return Response.json({ error: '成员标识过长' }, { status: 400 })
  }

  let news = MOCK_NEWS.filter((n) => n.status === 'published')

  if (category) news = news.filter((n) => n.category === category)
  if (memberSlug) {
    news = news.filter((n) => n.memberSlug === memberSlug || n.relatedMemberSlugs?.includes(memberSlug))
  }

  news = news.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())

  if (parsedLimit !== null) news = news.slice(0, parsedLimit)

  // Phase 2: 替换为 Sanity CMS 查询
  return Response.json({ news, total: news.length }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
