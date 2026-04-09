'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PricingToggle } from './components/pricing-toggle'
import { TierCard } from './components/tier-card'
import { FeatureComparison } from './components/feature-comparison'
import { useSubscription } from '@/lib/subscription-context'

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual')
  const router = useRouter()
  const { tier: currentTier } = useSubscription()

  function handleSelect(tier: string, selectedInterval: string) {
    router.push(`/settings/billing/upgrade?tier=${tier}&interval=${selectedInterval}`)
  }

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </div>

        <PricingToggle interval={interval} onChange={setInterval} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-start">
          {(['free', 'pro', 'pro_plus'] as const).map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              interval={interval}
              onSelect={handleSelect}
              currentTier={currentTier}
            />
          ))}
        </div>

        <FeatureComparison />

        <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
          <span>&#x2713; Cancel anytime</span>
          <span>&#x2713; 30-day money-back guarantee</span>
          <span>&#x2713; No contracts</span>
          <span>&#x2713; SSL encrypted</span>
        </div>
      </div>
    </main>
  )
}
