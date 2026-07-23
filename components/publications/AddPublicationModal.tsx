'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, Check, FileText, ExternalLink, Plus, PenLine, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import type { Publication, PublicationLookupCandidate, PublicationLookupConditionType, PublicationType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

interface ManualDraft {
  title: string
  authors: string
  venue: string
  year: string
  pubType: PublicationType
  language: 'zh' | 'en' | 'other'
  doi: string
  sourceUrl: string
  pdfUrl: string
  abstract: string
  tags: string
}

interface LookupConditionDraft {
  id: string
  type: PublicationLookupConditionType
  value: string
}

const EMPTY_MANUAL_DRAFT: ManualDraft = {
  title: '',
  authors: '',
  venue: '',
  year: String(new Date().getFullYear()),
  pubType: 'journal',
  language: 'zh',
  doi: '',
  sourceUrl: '',
  pdfUrl: '',
  abstract: '',
  tags: '',
}

const MAX_LOOKUP_CONDITIONS = 3
const MAX_AUTHOR_CONDITIONS = 3

const CONDITION_OPTIONS: Array<{
  value: PublicationLookupConditionType
  label: string
  placeholder: string
  helper: string
}> = [
  { value: 'title', label: '标题', placeholder: '输入论文标题', helper: '标题最多 1 条' },
  { value: 'author', label: '作者', placeholder: '输入作者姓名', helper: '作者最多 3 条' },
  { value: 'doi', label: 'DOI', placeholder: '输入 DOI 或 DOI 链接', helper: 'DOI 最多 1 条' },
]

function normalizeDoi(value: string) {
  return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
}

function createLookupCondition(type: PublicationLookupConditionType = 'title', value = ''): LookupConditionDraft {
  return {
    id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    value,
  }
}

function countConditionTypes(conditions: LookupConditionDraft[]) {
  return conditions.reduce((acc, condition) => {
    acc[condition.type] += 1
    return acc
  }, { title: 0, author: 0, doi: 0 })
}

export default function AddPublicationModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const { submitPublication } = useLabData()
  const [mode, setMode] = useState<'lookup' | 'manual'>('lookup')
  const [conditions, setConditions] = useState<LookupConditionDraft[]>([createLookupCondition('title')])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<PublicationLookupCandidate[]>([])
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [manual, setManual] = useState<ManualDraft>(EMPTY_MANUAL_DRAFT)
  const [manualSubmitted, setManualSubmitted] = useState(false)

  const handleClose = () => {
    setError('')
    setManualSubmitted(false)
    setManual(EMPTY_MANUAL_DRAFT)
    setConditions([createLookupCondition('title')])
    setResults([])
    onClose()
  }

  const updateCondition = (id: string, updates: Partial<LookupConditionDraft>) => {
    setConditions((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    setError('')
  }

  const removeCondition = (id: string) => {
    setConditions((current) => {
      if (current.length <= 1) return [createLookupCondition('title')]
      return current.filter((item) => item.id !== id)
    })
    setError('')
  }

  const addCondition = () => {
    setConditions((current) => {
      if (current.length >= MAX_LOOKUP_CONDITIONS) return current
      const counts = countConditionTypes(current)
      const nextType: PublicationLookupConditionType = counts.title === 0 ? 'title' : counts.author < MAX_AUTHOR_CONDITIONS ? 'author' : 'doi'
      return [...current, createLookupCondition(nextType)]
    })
    setError('')
  }

  const canUseType = (candidate: PublicationLookupConditionType, currentId: string) => {
    const counts = countConditionTypes(conditions)
    const current = conditions.find((item) => item.id === currentId)
    if (current?.type === candidate) {
      return true
    }
    if (candidate === 'title') return counts.title < 1
    if (candidate === 'doi') return counts.doi < 1
    return counts.author < MAX_AUTHOR_CONDITIONS
  }

  const handleSearch = async () => {
    const trimmed = conditions
      .map((condition) => ({ ...condition, value: condition.value.trim() }))
      .filter((condition) => condition.value.length > 0)

    if (trimmed.length === 0) {
      setError('请至少填写一条检索条件')
      return
    }

    const counts = countConditionTypes(trimmed)
    if (trimmed.length > MAX_LOOKUP_CONDITIONS) {
      setError('最多只能设置 3 个检索条件')
      return
    }
    if (counts.title > 1) {
      setError('标题条件最多只能填写 1 条')
      return
    }
    if (counts.doi > 1) {
      setError('DOI 条件最多只能填写 1 条')
      return
    }
    if (counts.author > MAX_AUTHOR_CONDITIONS) {
      setError('作者条件最多只能填写 3 条')
      return
    }

    setLoading(true)
    setError('')
    setResults([])
    setAddedIds(new Set())
    try {
      const params = new URLSearchParams()
      for (const condition of trimmed) {
        if (condition.type === 'title') {
          params.set('title', condition.value)
        } else if (condition.type === 'doi') {
          params.set('doi', normalizeDoi(condition.value))
        } else {
          params.append('author', condition.value)
        }
      }
      const resp = await fetch(`/api/publications/lookup?${params}`)
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.error || '查询失败')
      }
      const data = await resp.json()
      const candidates = data.candidates ?? []
      setResults(candidates)
      if (candidates.length === 0) {
        setError('未找到匹配论文，可调整标题、作者或 DOI 条件后重试，或切换到“手动录入”')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '查询失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (paper: Publication) => {
    if (!user) return false
    const result = submitPublication(paper, { slug: user.memberSlug, name: user.name })
    if (result.ok) {
      setAddedIds((prev) => new Set(prev).add(paper.id))
      setError('已提交管理员审核，审核通过后会同步到所有相关成员主页')
      return true
    } else {
      setError(result.error ?? '提交失败')
      return false
    }
  }

  const handleManualSubmit = () => {
    const title = manual.title.trim()
    const authors = manual.authors
      .split(/[;；、\n]+/)
      .map((author) => author.trim())
      .filter(Boolean)
    const venue = manual.venue.trim()
    const year = Number(manual.year)
    if (!title || authors.length === 0 || !venue || !Number.isInteger(year) || year < 1900 || year > 2100) {
      setError('请完整填写标题、作者、发表刊物和有效年份')
      return
    }

    const doi = normalizeDoi(manual.doi)
    const paper: Publication = {
      id: `manual_${Date.now()}`,
      title,
      authors,
      venue,
      year,
      doi: doi || undefined,
      sourceUrl: manual.sourceUrl.trim() || (doi ? `https://doi.org/${doi}` : undefined),
      pdfUrl: manual.pdfUrl.trim() || undefined,
      language: manual.language,
      abstract: manual.abstract.trim() || undefined,
      pubType: manual.pubType,
      citationCount: 0,
      downloadCount: 0,
      isHighlight: false,
      status: 'pending_review',
      source: 'manual',
      relatedMemberSlugs: [],
      tags: manual.tags.split(/[,，;；、]+/).map((tag) => tag.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    }
    if (handleAdd(paper)) setManualSubmitted(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      handleSearch()
    }
  }

  const counts = countConditionTypes(conditions)

  if (!user) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-indigo-400" />
                <h2 className="text-base font-semibold text-text-strong">添加论文</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 border-b border-border px-6 py-3">
              <button onClick={() => { setMode('lookup'); setError('') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${mode === 'lookup' ? 'bg-indigo-600 text-white' : 'text-text-muted hover:bg-surface-2'}`}><Search size={13} /> 自动查询</button>
              <button onClick={() => { setMode('manual'); setError('') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-text-muted hover:bg-surface-2'}`}><PenLine size={13} /> 手动录入</button>
            </div>

            {mode === 'lookup' && (
              <div className="border-b border-border px-6 py-4">
                <div className="space-y-3">
                  {conditions.map((condition, index) => {
                    const option = CONDITION_OPTIONS.find((item) => item.value === condition.type) ?? CONDITION_OPTIONS[0]
                    return (
                      <div key={condition.id} className="grid gap-2 sm:grid-cols-[112px_minmax(0,1fr)_42px]">
                        <label className="block text-xs text-text-muted">
                          条件 {index + 1}
                          <select
                            value={condition.type}
                            onChange={(event) => updateCondition(condition.id, { type: event.target.value as PublicationLookupConditionType })}
                            className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none focus:border-indigo-500/50"
                          >
                            {CONDITION_OPTIONS.map((item) => (
                              <option
                                key={item.value}
                                value={item.value}
                                disabled={!canUseType(item.value, condition.id)}
                              >
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs text-text-muted">
                          {option.label}
                          <div className="relative mt-1.5">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                              type="text"
                              value={condition.value}
                              onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                              onKeyDown={handleKeyDown}
                              placeholder={option.placeholder}
                              className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-10 pr-3 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                            />
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeCondition(condition.id)}
                          disabled={conditions.length === 1}
                          className="mt-6 flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                          aria-label="删除条件"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-faint">
                    <span>条件之间默认采用 AND 关系</span>
                    <span>·</span>
                    <span>标题 {counts.title}/1</span>
                    <span>作者 {counts.author}/3</span>
                    <span>DOI {counts.doi}/1</span>
                    <span>·</span>
                    <span>最多 3 条</span>
                  </div>
                  <button
                    type="button"
                    onClick={addCondition}
                    disabled={conditions.length >= MAX_LOOKUP_CONDITIONS}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-text-muted transition-colors hover:border-indigo-500/30 hover:text-indigo-400 disabled:opacity-40"
                  >
                    <Plus size={13} /> 添加条件
                  </button>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSearch}
                    disabled={loading || conditions.every((condition) => !condition.value.trim())}
                    className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                    查询
                  </button>
                </div>

                <p className="mt-2 text-xs text-text-faint">
                  你可以先填标题，再补作者或 DOI；多个条件会一起约束检索结果，更接近知网 / 万方那样的组合检索。若没有命中，再切换到「手动录入」
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-6 pt-3">
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                  {error}
                </p>
              </div>
            )}

            {mode === 'lookup' && <div className="max-h-[420px] overflow-y-auto px-6 py-4">
              {results.length === 0 && !loading && !error && (
                <div className="py-12 text-center text-sm text-text-faint">
                  查询结果将显示在这里
                </div>
              )}
              <div className="space-y-3">
                {results.map((candidate) => {
                  const { paper } = candidate
                  const added = addedIds.has(paper.id)
                  return (
                    <div
                      key={paper.id}
                      className="rounded-xl border border-border bg-surface-2 p-4 transition-all hover:border-indigo-500/30"
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-400">
                          {paper.venue || '未知会议'}
                        </span>
                        <span className="text-xs text-text-faint">{paper.year}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          paper.pubType === 'conference' ? 'bg-indigo-500/10 text-indigo-400' :
                          paper.pubType === 'journal' ? 'bg-cyan-500/10 text-cyan-400' :
                          'bg-slate-500/10 text-text-muted'
                        }`}>
                          {paper.pubType === 'conference' ? '会议' : paper.pubType === 'journal' ? '期刊' : paper.pubType === 'preprint' ? '预印本' : paper.pubType === 'book' ? '著作' : '学位论文'}
                        </span>
                        {paper.citationCount > 0 && (
                          <span className="text-xs text-text-muted">{paper.citationCount} 引用</span>
                        )}
                        <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">
                          置信度 {(candidate.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <h3 className="mb-1 text-sm font-medium leading-snug text-text-strong">
                        {paper.title}
                      </h3>
                      <p className="text-xs text-text-muted">{paper.authors.join(', ')}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {candidate.matchedFields.length > 0 && (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-green-400">
                            命中：{candidate.matchedFields.join('、')}
                          </span>
                        )}
                        {candidate.missingFields.length > 0 && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">
                            缺失：{candidate.missingFields.join('、')}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-text-faint">
                          来源：{candidate.source === 'semantic_scholar' ? 'Semantic Scholar' : candidate.source === 'crossref' ? 'Crossref' : 'DBLP'}
                        </span>
                      </div>
                      {paper.doi && (
                        <p className="mt-1.5 text-xs text-text-faint">DOI: {paper.doi}</p>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => handleAdd(paper)}
                          disabled={added}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            added
                              ? 'bg-green-500/10 text-green-400 cursor-default'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                          }`}
                        >
                          {added ? <Check size={13} /> : <Plus size={13} />}
                          {added ? '已提交审核' : '提交审核'}
                        </button>
                        {paper.pdfUrl && (
                          <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-indigo-400 transition-colors"
                          >
                            <FileText size={12} /> PDF
                          </a>
                        )}
                        {paper.arxivId && (
                          <a
                            href={`https://arxiv.org/abs/${paper.arxivId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-indigo-400 transition-colors"
                          >
                            <ExternalLink size={12} /> arXiv
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>}

            {mode === 'manual' && (
              <div className="max-h-[520px] overflow-y-auto px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-text-muted sm:col-span-2">论文标题 *<input value={manual.title} onChange={(event) => setManual({ ...manual, title: event.target.value })} placeholder="支持中文或英文标题" className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted sm:col-span-2">作者 *<textarea value={manual.authors} onChange={(event) => setManual({ ...manual, authors: event.target.value })} rows={2} placeholder="每位作者用分号、顿号或换行分隔；例如：张三；Yizhou Fan" className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted">期刊、会议、平台或出版社 *<input value={manual.venue} onChange={(event) => setManual({ ...manual, venue: event.target.value })} placeholder="如：中国电化教育 2026(6)" className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted">发表年份 *<input type="number" min="1900" max="2100" value={manual.year} onChange={(event) => setManual({ ...manual, year: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted">成果类型<select value={manual.pubType} onChange={(event) => setManual({ ...manual, pubType: event.target.value as PublicationType })} className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none focus:border-indigo-500/50"><option value="journal">期刊论文</option><option value="conference">会议论文</option><option value="preprint">预印本</option><option value="thesis">学位论文</option><option value="book">学术著作</option></select></label>
                  <label className="text-xs text-text-muted">内容语言<select value={manual.language} onChange={(event) => setManual({ ...manual, language: event.target.value as ManualDraft['language'] })} className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none focus:border-indigo-500/50"><option value="zh">中文</option><option value="en">英文</option><option value="other">其他</option></select></label>
                  <label className="text-xs text-text-muted">DOI（可选）<input value={manual.doi} onChange={(event) => setManual({ ...manual, doi: event.target.value })} placeholder="DOI 编号或完整链接" className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted">原文页面（可选）<input type="url" value={manual.sourceUrl} onChange={(event) => setManual({ ...manual, sourceUrl: event.target.value })} placeholder="CNKI、期刊官网或出版社页面" className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted sm:col-span-2">PDF 链接（可选）<input type="url" value={manual.pdfUrl} onChange={(event) => setManual({ ...manual, pdfUrl: event.target.value })} placeholder="可公开访问的 PDF 链接" className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted sm:col-span-2">摘要（可选）<textarea value={manual.abstract} onChange={(event) => setManual({ ...manual, abstract: event.target.value })} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none focus:border-indigo-500/50" /></label>
                  <label className="text-xs text-text-muted sm:col-span-2">关键词（可选）<input value={manual.tags} onChange={(event) => setManual({ ...manual, tags: event.target.value })} placeholder="多个关键词用逗号或分号分隔" className="mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50" /></label>
                </div>
                <button onClick={handleManualSubmit} disabled={manualSubmitted} className={`mt-5 flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${manualSubmitted ? 'bg-green-500/10 text-green-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>{manualSubmitted ? <Check size={14} /> : <Plus size={14} />}{manualSubmitted ? '已提交审核' : '提交管理员审核'}</button>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border px-6 py-3">
              <p className="text-center text-xs text-text-faint">
                仅允许提交作者中包含课题组成员的论文；重复论文会被自动拦截
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
