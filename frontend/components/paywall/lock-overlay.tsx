'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type PaywallCapability, PAYWALL_MESSAGES } from '@/lib/paywall-messages'

interface LockOverlayProps {
  capability: PaywallCapability
  children: React.ReactNode
  className?: string
}

export function LockOverlay({ capability, children, className }: LockOverlayProps) {
  const router = useRouter()
  const msg = PAYWALL_MESSAGES[capability]

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] cursor-pointer gap-2 rounded-lg"
        onClick={() => router.push('/pricing')}
      >
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {msg.requiredTier === 'pro_plus' ? 'Pro+' : 'Pro'} feature
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-[200px]">
          {msg.headline}
        </p>
      </div>
    </div>
  )
}
