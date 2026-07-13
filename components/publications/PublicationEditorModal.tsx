'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Save, X } from 'lucide-react'
import type { Publication, PublicationType } from '@/types'

interface Props {
  open: boolean
  paper: Publication
  onClose: () => void
  onSave: (paper: Publication) => { ok: boolean; error?: string }
}

interface FormState {
  title: string
  authors: string
  venue: string
  year: string
  pubType: PublicationType
  language: 'zh' | 'en' | 'other'
  doi: string
  arxivId: string
  sourceUrl: string
  pdfUrl: string
  codeUrl: string
  abstract: string
  tags: string
  citationCount: string
  downloadCount: string
}

function normalizeDoi(value: string) {
  return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '')
}

function createForm(paper: Publication): FormState {
  return {
    title: paper.title,
    authors: paper.authors.join('；'),
    venue: paper.venue,
    year: String(paper.year),
    pubType: paper.pubType,
    language: paper.language ?? 'other',
    doi: paper.doi ?? '',
    arxivId: paper.arxivId ?? '',
    sourceUrl: paper.sourceUrl ?? '',
    pdfUrl: paper.pdfUrl ?? '',
    codeUrl: paper.codeUrl ?? '',
    abstract: paper.abstract ?? '',
    tags: paper.tags?.join('，') ?? '',
    citationCount: String(paper.citationCount || 0),
    downloadCount: String(paper.downloadCount || 0),
  }
}

export default function PublicationEditorModal({ open, paper, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => createForm(paper))
  const [error, setError] = useState('')
  const inputClass = 'mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50'

  const save = () => {
    const title = form.title.trim()
    const authors = form.authors
      .split(/[;；、\n]+/)
      .map((author) => author.trim())
      .filter(Boolean)
    const venue = form.venue.trim()
    const year = Number(form.year)
    const citationCount = Number(form.citationCount)
    const downloadCount = Number(form.downloadCount)
    if (!title || authors.length === 0 || !venue || !Number.isInteger(year) || year < 1900 || year > 2100) {
      setError('请完整填写标题、作者、发表来源和有效年份')
      return
    }
    if (!Number.isFinite(citationCount) || citationCount < 0 || !Number.isFinite(downloadCount) || downloadCount < 0) {
      setError('被引量和下载量必须是大于或等于 0 的数字')
      return
    }

    const doi = normalizeDoi(form.doi)
    const result = onSave({
      ...paper,
      title,
      authors,
      venue,
      year,
      pubType: form.pubType,
      language: form.language,
      doi: doi || undefined,
      arxivId: form.arxivId.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || (doi ? `https://doi.org/${doi}` : undefined),
      pdfUrl: form.pdfUrl.trim() || undefined,
      codeUrl: form.codeUrl.trim() || undefined,
      abstract: form.abstract.trim() || undefined,
      tags: form.tags.split(/[,，;；、]+/).map((tag) => tag.trim()).filter(Boolean),
      citationCount: Math.round(citationCount),
      downloadCount: Math.round(downloadCount),
    })
    if (!result.ok) {
      setError(result.error ?? '保存失败')
      return
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              <div className="flex items-center gap-2"><Pencil size={17} className="text-indigo-400" /><h2 className="font-semibold text-text-strong">编辑论文</h2></div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-2 hover:text-text"><X size={18} /></button>
            </header>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="text-xs text-text-muted sm:col-span-2">标题 *<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted sm:col-span-2">作者 *<textarea value={form.authors} onChange={(event) => setForm({ ...form, authors: event.target.value })} rows={2} className={`${inputClass} resize-none`} /><span className="mt-1 block text-text-faint">每位作者使用分号、顿号或换行分隔</span></label>
              <label className="text-xs text-text-muted">期刊、会议、平台或出版社 *<input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted">年份 *<input type="number" min="1900" max="2100" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted">成果类型<select value={form.pubType} onChange={(event) => setForm({ ...form, pubType: event.target.value as PublicationType })} className={inputClass}><option value="journal">期刊论文</option><option value="conference">会议论文</option><option value="preprint">预印本</option><option value="thesis">学位论文</option><option value="book">学术著作</option></select></label>
              <label className="text-xs text-text-muted">语言<select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value as FormState['language'] })} className={inputClass}><option value="zh">中文</option><option value="en">英文</option><option value="other">其他</option></select></label>
              <label className="text-xs text-text-muted">被引量<input type="number" min="0" value={form.citationCount} onChange={(event) => setForm({ ...form, citationCount: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted">下载量<input type="number" min="0" value={form.downloadCount} onChange={(event) => setForm({ ...form, downloadCount: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted">DOI<input value={form.doi} onChange={(event) => setForm({ ...form, doi: event.target.value })} placeholder="DOI 编号或完整链接" className={inputClass} /></label>
              <label className="text-xs text-text-muted">arXiv ID<input value={form.arxivId} onChange={(event) => setForm({ ...form, arxivId: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted">原文页面<input type="url" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted">PDF 链接<input type="url" value={form.pdfUrl} onChange={(event) => setForm({ ...form, pdfUrl: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted sm:col-span-2">代码链接<input type="url" value={form.codeUrl} onChange={(event) => setForm({ ...form, codeUrl: event.target.value })} className={inputClass} /></label>
              <label className="text-xs text-text-muted sm:col-span-2">摘要<textarea value={form.abstract} onChange={(event) => setForm({ ...form, abstract: event.target.value })} rows={5} className={`${inputClass} resize-y`} /></label>
              <label className="text-xs text-text-muted sm:col-span-2">关键词<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="多个关键词用逗号或分号分隔" className={inputClass} /></label>
            </div>

            {error && <p className="mx-6 mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-surface px-6 py-4"><button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text">取消</button><button onClick={save} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"><Save size={14} /> 保存修改</button></footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
