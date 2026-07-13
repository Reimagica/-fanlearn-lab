'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileUp, Plus, Search, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import AddPublicationModal from '@/components/publications/AddPublicationModal'
import BibtexImportModal from '@/components/publications/BibtexImportModal'
import PublicationCard, { PUBLICATION_TYPE_LABEL } from '@/components/publications/PublicationCard'
import PublicationEditorModal from '@/components/publications/PublicationEditorModal'
import type { Publication, PublicationType } from '@/types'

export default function PublicationsPage() {
  const { user } = useAuth()
  const { publications, reviews, updatePublication, removePublication } = useLabData()
  const [query, setQuery] = useState('')
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState<PublicationType | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [bibOpen, setBibOpen] = useState(false)
  const [editingPaper, setEditingPaper] = useState<Publication | null>(null)
  const [managementMessage, setManagementMessage] = useState('')

  const savePublication = (paper: Publication) => {
    const result = updatePublication(paper)
    if (result.ok) setManagementMessage('论文信息已更新，并已同步相关成员主页与首页统计。')
    return result
  }

  const deletePublication = (paper: Publication) => {
    if (!window.confirm(`确定删除《${paper.title}》吗？删除后无法撤销。`)) return
    const result = removePublication(paper.id)
    setManagementMessage(result.ok ? '论文已删除。' : result.error ?? '删除失败')
  }

  const years = useMemo(
    () => [...new Set(publications.map((paper) => paper.year))].sort((a, b) => b - a),
    [publications],
  )

  const filtered = useMemo(() => publications
    .filter((paper) => {
      if (yearFilter && paper.year !== yearFilter) return false
      if (typeFilter && paper.pubType !== typeFilter) return false
      if (!query.trim()) return true
      const target = [paper.title, paper.authors.join(' '), paper.venue, ...(paper.tags ?? [])].join(' ').toLowerCase()
      return target.includes(query.trim().toLowerCase())
    })
    .sort((a, b) => b.year - a.year), [publications, query, typeFilter, yearFilter])

  const myPendingCount = user
    ? reviews.filter((item) => item.contentType === 'publication' && item.submittedBy === user.memberSlug && item.humanReviewStatus === 'pending').length
    : 0

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-text-strong sm:text-5xl">学术成果</h1>
          <p className="text-text-muted">共 {publications.length} 篇已发布论文</p>
        </motion.div>

        {user && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500">
              <Plus size={15} /> 添加论文
            </button>
            <button onClick={() => setBibOpen(true)} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:border-indigo-500/30 hover:text-indigo-400">
              <FileUp size={15} /> 从 BibTeX 导入
            </button>
            {myPendingCount > 0 && (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">我提交的 {myPendingCount} 项待审核</span>
            )}
          </div>
        )}
        {managementMessage && <p className="mb-5 rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">{managementMessage}</p>}

        <div className="relative mb-8">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索论文标题、作者、会议、关键词…" className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-10 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"><X size={15} /></button>}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
          <aside>
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">筛选</h2>
              <p className="mb-2 text-xs text-text-faint">年份</p>
              <div className="mb-5 space-y-1">
                <button onClick={() => setYearFilter(null)} className={`w-full px-2 py-1 text-left text-xs ${!yearFilter ? 'text-indigo-400' : 'text-text-muted hover:text-text'}`}>全部</button>
                {years.map((year) => <button key={year} onClick={() => setYearFilter(year === yearFilter ? null : year)} className={`w-full px-2 py-1 text-left text-xs ${yearFilter === year ? 'text-indigo-400' : 'text-text-muted hover:text-text'}`}>{year}</button>)}
              </div>
              <p className="mb-2 text-xs text-text-faint">类型</p>
              <div className="space-y-1">
                <button onClick={() => setTypeFilter(null)} className={`w-full px-2 py-1 text-left text-xs ${!typeFilter ? 'text-indigo-400' : 'text-text-muted hover:text-text'}`}>全部</button>
                {(Object.keys(PUBLICATION_TYPE_LABEL) as PublicationType[]).map((type) => <button key={type} onClick={() => setTypeFilter(type === typeFilter ? null : type)} className={`w-full px-2 py-1 text-left text-xs ${typeFilter === type ? 'text-indigo-400' : 'text-text-muted hover:text-text'}`}>{PUBLICATION_TYPE_LABEL[type]}</button>)}
              </div>
            </div>
          </aside>

          <section>
            <p className="mb-3 text-xs text-text-muted">找到 {filtered.length} 篇</p>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((paper) => <PublicationCard key={paper.id} paper={paper} onEdit={user?.isAdmin ? setEditingPaper : undefined} onDelete={user?.isAdmin ? deletePublication : undefined} />)}
              </AnimatePresence>
              {filtered.length === 0 && <p className="py-12 text-center text-sm text-text-muted">无匹配结果</p>}
            </div>
          </section>
        </div>
      </div>

      <AddPublicationModal open={addOpen} onClose={() => setAddOpen(false)} />
      <BibtexImportModal open={bibOpen} onClose={() => setBibOpen(false)} />
      {editingPaper && <PublicationEditorModal key={editingPaper.id} open paper={editingPaper} onClose={() => setEditingPaper(null)} onSave={savePublication} />}
    </div>
  )
}
