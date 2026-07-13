'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Copy, Download, ExternalLink, FileText, Pencil, Quote, Trash2 } from 'lucide-react'
import type { Publication, PublicationType } from '@/types'

export const PUBLICATION_TYPE_LABEL: Record<PublicationType, string> = {
  conference: '会议论文',
  journal: '期刊论文',
  preprint: '预印本',
  thesis: '学位论文',
  book: '学术著作',
}

const TYPE_COLOR: Record<PublicationType, string> = {
  conference: 'text-indigo-400 bg-indigo-400/10',
  journal: 'text-cyan-400 bg-cyan-400/10',
  preprint: 'text-text-muted bg-surface-2',
  thesis: 'text-green-400 bg-green-400/10',
  book: 'text-purple-400 bg-purple-400/10',
}

export function publicationToBibTeX(paper: Publication): string {
  const entryType = paper.pubType === 'journal'
    ? 'article'
    : paper.pubType === 'thesis'
      ? 'mastersthesis'
      : paper.pubType === 'book'
        ? 'book'
        : 'inproceedings'
  const venueField = paper.pubType === 'journal' ? 'journal' : paper.pubType === 'book' ? 'publisher' : 'booktitle'
  const key = `${paper.authors[0]?.split(' ').pop() ?? 'unknown'}${paper.year}`
  return `@${entryType}{${key},
  title = {${paper.title}},
  author = {${paper.authors.join(' and ')}},
  ${venueField} = {${paper.venue}},
  year = {${paper.year}},${paper.doi ? `\n  doi = {${paper.doi}},` : ''}${paper.sourceUrl ? `\n  url = {${paper.sourceUrl}},` : ''}
}`
}

interface Props {
  paper: Publication
  badge?: string
  onEdit?: (paper: Publication) => void
  onDelete?: (paper: Publication) => void
}

export default function PublicationCard({ paper, badge, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyBibTeX = async () => {
    await navigator.clipboard.writeText(publicationToBibTeX(paper))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border border-border bg-surface p-5 transition-all hover:border-indigo-500/25"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[paper.pubType]}`}>
              {PUBLICATION_TYPE_LABEL[paper.pubType]}
            </span>
            <span className="text-xs font-semibold text-text">{paper.venue}</span>
            <span className="text-xs text-text-muted">{paper.year}</span>
            {badge && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">{badge}</span>}
          </div>
          <Link
            href={`/publications/${encodeURIComponent(paper.id)}`}
            className="block text-sm font-medium leading-snug text-text-strong transition-colors hover:text-indigo-400"
          >
            {paper.title}
          </Link>
          <p className="mt-1 text-xs text-text-muted">{paper.authors.join(', ')}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs text-text-muted sm:flex-row">
          <span className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1"><Quote size={11} /> 被引 {paper.citationCount || 0}</span>
          <span className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1"><Download size={11} /> 下载 {paper.downloadCount || 0}</span>
        </div>
      </div>

      {paper.tags && paper.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {paper.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        {paper.arxivId && (
          <a href={`https://arxiv.org/abs/${paper.arxivId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <ExternalLink size={12} /> arXiv
          </a>
        )}
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <FileText size={12} /> PDF
          </a>
        )}
        {paper.doi && (
          <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <ExternalLink size={12} /> DOI
          </a>
        )}
        {paper.sourceUrl && paper.sourceUrl !== paper.pdfUrl && paper.sourceUrl !== `https://doi.org/${paper.doi}` && (
          <a href={paper.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <ExternalLink size={12} /> 原文
          </a>
        )}
        {paper.codeUrl && (
          <a href={paper.codeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
            <ExternalLink size={12} /> Code
          </a>
        )}
        <button onClick={copyBibTeX} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? '已复制' : 'BibTeX'}
        </button>
        {paper.abstract && (
          <button onClick={() => setExpanded((value) => !value)} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? '收起摘要' : '展开摘要'}
          </button>
        )}
        {(onEdit || onDelete) && <div className="ml-auto flex items-center gap-2 border-l border-border pl-3">
          {onEdit && <button onClick={() => onEdit(paper)} className="flex items-center gap-1 text-xs text-text-muted hover:text-indigo-400"><Pencil size={12} /> 编辑</button>}
          {onDelete && <button onClick={() => onDelete(paper)} className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400"><Trash2 size={12} /> 删除</button>}
        </div>}
      </div>

      <AnimatePresence>
        {expanded && paper.abstract && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-xs leading-6 text-text-muted">{paper.abstract}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
