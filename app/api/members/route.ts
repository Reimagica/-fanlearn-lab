import { MOCK_MEMBERS } from '@/lib/mock-data'

const MEMBER_CATEGORIES = ['advisor', 'researcher', 'alumni'] as const

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')

  if (category && !MEMBER_CATEGORIES.includes(category as typeof MEMBER_CATEGORIES[number])) {
    return Response.json({ error: '成员分类无效' }, { status: 400 })
  }
  if (active && active !== 'true' && active !== 'false') {
    return Response.json({ error: 'active 参数仅支持 true 或 false' }, { status: 400 })
  }

  let members = MOCK_MEMBERS

  if (category) members = members.filter((m) => m.category === category)
  if (active === 'true') members = members.filter((m) => m.isActive)
  if (active === 'false') members = members.filter((m) => !m.isActive)

  // Phase 2: 替换为 Sanity CMS 查询
  return Response.json({ members, total: members.length }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
