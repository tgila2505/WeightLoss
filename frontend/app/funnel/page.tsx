'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { trackFunnelEvent } from '@/lib/analytics'
import { CostAnchor } from './components/cost-anchor'
import { FunnelHero } from './components/funnel-hero'
import { HowItWorks } from './components/how-it-works'
import { PlanCounter } from './components/social-proof/plan-counter'
import { TestimonialCard } from './components/social-proof/testimonial-card'
import { TransformationCard } from './components/social-proof/transformation-card'

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    result: 'Lost 8kg in 10 weeks',
    quote: 'I\'d been guessing my calories for years. Getting an exact target changed everything.',
  },
  {
    name: 'James T.',
    result: 'Down 12kg in 14 weeks',
    quote: 'The macro split was the missing piece. I wasn\'t eating enough protein.',
  },
  {
    name: 'Priya K.',
    result: 'Lost 6kg in 8 weeks',
    quote: 'Simple, personalised, and actually worked. The meal plan saved me hours of planning.',
  },
]

export default function FunnelLandingPage() {
  useEffect(() => {
    trackFunnelEvent('landing_viewed')
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <span className="font-bold text-white text-lg">WeightLoss AI</span>
        <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <FunnelHero />

      {/* Social proof strip */}
      <section className="px-4 py-6 border-y border-zinc-900 bg-zinc-900/50">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
          <PlanCounter />
          <span>Based on your biometrics</span>
          <span>No generic templates</span>
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Sample output preview — blurred */}
      <section className="px-4 py-8 max-w-sm mx-auto">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6 overflow-hidden">
          <div className="blur-sm select-none pointer-events-none">
            <p className="text-zinc-400 text-xs mb-2">Your 7-day meal plan</p>
            <div className="space-y-2">
              {['Mon: Oat bowl + chicken salad', 'Tue: Greek yoghurt + salmon wrap', 'Wed: Eggs + steak + veggies'].map((line) => (
                <div key={line} className="bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/60 rounded-2xl">
            <span className="text-2xl">🔒</span>
            <p className="text-white font-medium text-sm">Unlock with Pro</p>
          </div>
        </div>
      </section>

      {/* Cost anchor */}
      <CostAnchor />

      {/* Testimonials */}
      <section className="px-4 py-10 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold text-white text-center mb-8">Real results</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </section>

      {/* Transformation examples */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="space-y-4">
          <TransformationCard startWeight="92kg" currentWeight="81kg" weeks={14} />
          <TransformationCard startWeight="78kg" currentWeight="68kg" weeks={12} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12 text-center">
        <Button asChild size="lg" className="text-base px-8 py-4 h-auto">
          <Link href="/funnel/start">Get your plan — it&apos;s free</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-zinc-900 text-center text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} WeightLoss AI · <Link href="/login" className="hover:text-zinc-400">Log in</Link></p>
      </footer>
    </main>
  )
}
