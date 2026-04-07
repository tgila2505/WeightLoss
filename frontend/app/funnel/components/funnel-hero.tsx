'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getFunnelVariants } from '@/lib/feature-flags'
import { trackFunnelEvent } from '@/lib/analytics'

const HEADLINES = {
  A: 'Your AI Metabolic Coach',
  B: 'Lose Weight With a Plan Built for Your Body',
}

const CTAS = {
  A: 'Get your plan — it\'s free',
  B: 'Calculate my calories now',
}

export function FunnelHero() {
  const [variants, setVariants] = useState({ headline: 'A' as 'A' | 'B', cta: 'A' as 'A' | 'B' })

  useEffect(() => {
    const v = getFunnelVariants()
    setVariants(v)
    trackFunnelEvent('landing_variant_viewed', { headline_variant: v.headline, cta_variant: v.cta })
  }, [])

  return (
    <section className="flex flex-col items-center text-center px-4 pt-20 pb-12 gap-6">
      <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-2xl">
        {HEADLINES[variants.headline]}
      </h1>
      <p className="text-lg text-zinc-400 max-w-md">
        Answer 3 questions. Get your personalised calorie target and macro split in 60 seconds.
      </p>
      <Button asChild size="lg" className="mt-2 text-base px-8 py-4 h-auto">
        <Link href="/funnel/start">{CTAS[variants.cta]}</Link>
      </Button>
      <p className="text-xs text-zinc-500">No credit card required · Free forever for calorie tracking</p>
    </section>
  )
}
