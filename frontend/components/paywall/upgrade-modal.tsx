'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { type PaywallCapability, PAYWALL_MESSAGES } from '@/lib/paywall-messages'

interface UpgradeModalProps {
  open: boolean
  capability: PaywallCapability | null
  onClose: () => void
}

export function UpgradeModal({ open, capability, onClose }: UpgradeModalProps) {
  const router = useRouter()
  const msg = capability ? PAYWALL_MESSAGES[capability] : null

  function handleUpgrade() {
    onClose()
    router.push('/pricing')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{msg?.headline ?? 'Upgrade your plan'}</DialogTitle>
          <DialogDescription>{msg?.subCopy}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={handleUpgrade} className="w-full">
            {msg?.requiredTier === 'pro_plus' ? 'Upgrade to Pro+' : 'Upgrade to Pro'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe later
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Cancel anytime · 30-day money-back guarantee
        </p>
      </DialogContent>
    </Dialog>
  )
}
