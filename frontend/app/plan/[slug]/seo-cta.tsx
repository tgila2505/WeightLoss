'use client'
import { useEffect, useState } from 'react'
import { getSeoCtaVariant } from '@/lib/ab-testing'
import { getFeatureFlags } from '@/lib/feature-flags'

interface Props {
  href: string
  defaultText: string
}

export function SeoCta({ href, defaultText }: Props) {
  const [text, setText] = useState(defaultText)

  useEffect(() => {
    const flags = getFeatureFlags()
    const variant = getSeoCtaVariant(flags.seoAbEnabled, flags.seoAbRollout)
    if (variant === 'social_proof') {
      setText("Join 10,000+ people who've hit their goal →")
    }
  }, [])

  return (
    <a
      href={href}
      className="inline-block px-8 py-3 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 transition-colors"
    >
      {text}
    </a>
  )
}
