'use client'

import { trackFunnelEvent } from '@/lib/analytics'
import { getFunnelProfile } from '@/lib/funnel-session'
import { useEffect } from 'react'
import { UpgradeForm } from './components/upgrade-form'
import { ValueRecap } from './components/value-recap'

export default function FunnelUpgradePage() {
  const profile = getFunnelProfile()

  useEffect(() => {
    trackFunnelEvent('upgrade_clicked')
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <ValueRecap name={profile?.name} />
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>
            <UpgradeForm />
          </div>
        </div>
      </div>
    </main>
  )
}
