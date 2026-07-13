'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Publication } from '@/types'

const STORAGE_KEY = 'fl_user_publications'

function read(): Publication[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Publication[]) : []
  } catch {
    return []
  }
}

function write(papers: Publication[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(papers))
  window.dispatchEvent(new CustomEvent('fl-user-pubs-change'))
}

export function getUserPapers(): Publication[] {
  return read()
}

export function addUserPaper(paper: Publication) {
  const list = read()
  // 去重（按 DOI 或标题）
  const exists = list.some(
    (x) =>
      (x.doi && paper.doi && x.doi === paper.doi) ||
      x.title.toLowerCase() === paper.title.toLowerCase(),
  )
  if (exists) return false
  write([paper, ...list])
  return true
}

export function addUserPapers(papers: Publication[]): { added: number; skipped: number } {
  const list = read()
  let added = 0
  let skipped = 0
  for (const p of papers) {
    const exists = list.some(
      (x) =>
        (x.doi && p.doi && x.doi === p.doi) ||
        x.title.toLowerCase() === p.title.toLowerCase(),
    )
    if (exists) {
      skipped++
    } else {
      list.unshift(p)
      added++
    }
  }
  write(list)
  return { added, skipped }
}

export function removeUserPaper(id: string) {
  write(read().filter((p) => p.id !== id))
}

export function clearUserPapers() {
  write([])
}

/**
 * 订阅用户添加的论文，与服务器 mock 数据合并展示
 */
export function useUserPublications() {
  const [papers, setPapers] = useState<Publication[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setPapers(read()), 0)
    const handler = () => setPapers(read())
    window.addEventListener('fl-user-pubs-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('fl-user-pubs-change', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const add = useCallback((p: Publication) => {
    return addUserPaper(p)
  }, [])

  const addBulk = useCallback((ps: Publication[]) => {
    return addUserPapers(ps)
  }, [])

  const remove = useCallback((id: string) => {
    removeUserPaper(id)
  }, [])

  return { papers, add, addBulk, remove }
}
