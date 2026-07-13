import type { Member, Publication } from '@/types'

/**
 * 构建成员姓名匹配集合：中文名、英文名、别名，统一小写 + 去点
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
}

function nameVariants(name: string): string[] {
  const variants = [normalizeName(name)]
  if (name.includes(',')) {
    const [last, ...rest] = name.split(',')
    variants.push(normalizeName(`${rest.join(' ')} ${last}`))
  }
  return Array.from(new Set(variants.filter(Boolean)))
}

function buildMemberNames(member: Member): string[] {
  const names = [member.name, member.nameEn, ...(member.aliases ?? [])]
  return Array.from(new Set(names.filter(Boolean).flatMap(nameVariants)))
}

/**
 * 判断某篇论文是否与指定成员相关。
 * 优先用 relatedMemberSlugs 显式关联（向后兼容），
 * 若无显式关联则用作者名自动匹配（LWT aliases 模式）。
 */
export function isPaperByMember(paper: Publication, member: Member): boolean {
  // 有显式关联时以显式结果为准，避免中英文同名作者被误关联。
  if (paper.relatedMemberSlugs?.length > 0) {
    return paper.relatedMemberSlugs.includes(member.slug)
  }

  // 自动匹配
  const memberNames = buildMemberNames(member)
  return paper.authors.some((author) => {
    return nameVariants(author).some((authorName) => memberNames.some(
      (memberName) => authorName === memberName || (memberName.length >= 6 && (authorName.includes(memberName) || memberName.includes(authorName))),
    ))
  })
}

/**
 * 获取成员参与的所有论文
 */
export function getMemberPapers(member: Member, allPapers: Publication[]): Publication[] {
  return allPapers
    .filter((p) => isPaperByMember(p, member))
    .sort((a, b) => b.year - a.year)
}

/**
 * 给定一批论文和成员列表，返回每篇论文关联的成员（用于展示标签等）
 */
export function findPaperMembers(
  paper: Publication,
  members: Member[],
): Member[] {
  return members.filter((m) => isPaperByMember(paper, m))
}
