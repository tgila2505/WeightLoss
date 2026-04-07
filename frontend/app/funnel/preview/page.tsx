'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics'
import { type FunnelPreview, fetchFunnelPreview, getFunnelProfile } from '@/lib/funnel-session'
import { CountdownTimer } from './components/countdown-timer'
import { LockedPlanPreview } from './components/locked-plan-preview'
import { PlanPreviewCard } from './components/plan-preview-card'

export default function FunnelPreviewPage() {
  const router = useRouter()
  const [preview, setPreview] = useState<FunnelPreview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFunnelPreview()
      .then((data) => {
        setPreview(data)
        trackFunnelEvent('preview_viewed')
      })
      .catch(() => {
        // No valid session — send back to start
        router.replace('/funnel/start')
      })
  }, [router])

  const profile = getFunnelProfile()
  const name = preview?.name ?? profile?.name ?? ''

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {name ? `Here's ${name}'s metabolic baseline` : 'Your metabolic baseline'}
          </h1>
          {preview && name && (
            <p className="text-zinc-400 text-sm mt-1">
              {name}, to reach {preview.goal_weight_kg}kg in {preview.timeline_weeks} weeks, you need:
            </p>
          )}
        </div>

        {preview ? (
          <>
            <PlanPreviewCard preview={preview} />
            <CountdownTimer />
            <LockedPlanPreview />
          </>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
