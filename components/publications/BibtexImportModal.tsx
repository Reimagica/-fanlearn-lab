'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, X, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useLabData } from '@/lib/lab-data'
import { parseBibtex } from '@/lib/bibtex-parser'

interface Props {
  open: boolean
  onClose: () => void
}

const SAMPLE_BIB = `@inproceedings{example2024,
  title = {FeedbackGen: Automated Personalized Feedback Generation},
  author = {Xia, Mengyu and Fan, Yizhou},
  booktitle = {Proceedings of ACL 2024},
  year = {2024},
  doi = {10.18653/v1/2024.acl-long.001},
  abstract = {We propose a framework for personalized feedback...},
}`

export default function BibtexImportModal({ open, onClose }: Props) {
  const { user } = useAuth()
  const { submitPublications } = useLabData()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<{ count: number; errors: string[]; added: number; skipped: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleParse = () => {
    if (!text.trim()) return
    setLoading(true)
    setParsed(null)
    // 异步以避免大文本阻塞 UI
    setTimeout(() => {
      const { papers, errors } = parseBibtex(text)
      if (!user) return
      const result = submitPublications(papers, { slug: user.memberSlug, name: user.name })
      setParsed({ count: papers.length, errors: [...errors, ...result.errors], added: result.submitted, skipped: result.skipped })
      setLoading(false)
    }, 100)
  }

  const handleSample = () => setText(SAMPLE_BIB)

  if (!user) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
          onClick={onClose}
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
                <FileUp size={18} className="text-indigo-400" />
                <h2 className="text-base font-semibold text-text-strong">从 BibTeX 导入</h2>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">
                  批量
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-text-muted">粘贴 BibTeX 文本（支持多条目）</p>
                <button
                  onClick={handleSample}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  填入示例
                </button>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="@inproceedings{key, ...}"
                rows={10}
                className="w-full resize-none rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs text-text-strong outline-none placeholder:text-text-faint focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                style={{ minHeight: '180px' }}
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={handleParse}
                  disabled={loading || !text.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                  解析并提交审核
                </button>
                <span className="text-xs text-text-faint">
                  解析器支持 @article / @inproceedings / @phdthesis 等标准条目
                </span>
              </div>
            </div>

            {/* Result */}
            {parsed && (
              <div className="border-t border-border px-6 py-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs text-green-400">
                    <Check size={13} />
                    已提交 {parsed.added} 篇
                  </div>
                  {parsed.skipped > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">
                      跳过 {parsed.skipped} 篇（重复）
                    </div>
                  )}
                  <div className="text-xs text-text-muted">共解析 {parsed.count} 条</div>
                </div>
                {parsed.errors.length > 0 && (
                  <div className="space-y-1">
                    {parsed.errors.slice(0, 3).map((e, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400"
                      >
                        <AlertCircle size={12} className="mt-0.5 shrink-0" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-border px-6 py-3">
              <p className="text-center text-xs text-text-faint">
                所有条目都会进行本组作者校验、重复检查和管理员审核
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
