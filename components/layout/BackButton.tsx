'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface BackButtonProps {
  href?: string
  label?: string
}

export default function BackButton({ href, label = '返回' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft size={16} />
        {label}
      </Link>
    )
  }

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  )
}
