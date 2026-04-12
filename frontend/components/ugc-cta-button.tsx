'use client'

import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics'
import { readUtm } from '@/lib/utm'

interface Props {
  href: string
  label: string
  slug: string
}

export function UgcCtaButton({ href, label, slug }: Props) {
  function handleClick() {
    const utm = readUtm()
    trackFunnelEvent('ugc_cta_clicked', { slug, ...utm })
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="inline-block px-8 py-3 rounded-xl font-semibold text-base bg-blue-500 text-white hover:bg-blue-400 transition-colors"
    >
      {label}
    </Link>
  )
}
