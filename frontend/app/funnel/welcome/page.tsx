'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { trackFunnelEvent } from '@/lib/analytics'
import { clearFunnelSession, getFunnelProfile } from '@/lib/funnel-session'

export default function FunnelWelcomePage() {
  const profile = getFunnelProfile()

  useEffect(() => {
    trackFunnelEvent('conversion_completed')
    clearFunnelSession()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-8">
      <div className="space-y-3">
        <p className="text-5xl">🎉</p>
        <h1 className="text-3xl font-bold text-white">
          {profile?.name ? `You're in, ${profile.name}.` : "You're in."}
        </h1>
        <p className="text-zinc-400">Your full plan is ready.</p>
      </div>
      <Button asChild size="lg" className="text-base px-8 py-4 h-auto">
        <Link href="/dashboard">Go to your dashboard →</Link>
      </Button>
      <p className="text-zinc-600 text-xs">
        Your 7-day free trial has started · You&apos;ll be charged $9 after 7 days
      </p>
    </main>
  )
}
