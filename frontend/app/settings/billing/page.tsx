'use client'

import { useState } from 'react'
import { useSubscription } from '@/lib/subscription-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export default function BillingSettingsPage() {
  const subscription = useSubscription()
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false)
  const [autoRenewError, setAutoRenewError] = useState<string | null>(null)

  const tierLabel =
    subscription.tier === 'pro_plus' ? 'Pro+' : subscription.tier === 'pro' ? 'Pro' : 'Free'
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null
  const autoRenew = !subscription.cancel_at_period_end

  async function handleCancel() {
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/cancel`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCancelError(data.error?.message ?? data.detail ?? 'Failed to cancel subscription')
        return
      }
      window.location.href = '/settings/billing'
    } finally {
      setCancelling(false)
    }
  }

  async function handleAutoRenewToggle(enabled: boolean) {
    setTogglingAutoRenew(true)
    setAutoRenewError(null)
    try {
      const endpoint = enabled ? 'reactivate' : 'cancel'
      const res = await fetch(`${API_BASE}/api/v1/billing/${endpoint}`, {
        method: 'POST',
        credentials: 'include' as RequestCredentials,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAutoRenewError(data.error?.message ?? data.detail ?? 'Failed to update auto-renewal')
        return
      }
      window.location.href = '/settings/billing'
    } finally {
      setTogglingAutoRenew(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {subscription.loading ? 'Loading\u2026' : `You are on the ${tierLabel} plan`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {subscription.past_due && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
              Payment failed. Please update your payment method to keep access.
            </div>
          )}
          {subscription.cancel_at_period_end && periodEnd && (
            <div className="rounded-lg bg-muted text-sm px-4 py-3">
              Your {tierLabel} access continues until {periodEnd}. After that, you&apos;ll be on the free plan.
            </div>
          )}
          <div className="flex gap-3">
            {subscription.tier === 'free' ? (
              <Button onClick={() => router.push('/pricing')}>Upgrade</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => router.push('/pricing')}>
                  Change plan
                </Button>
                {!subscription.cancel_at_period_end && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        Cancel subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You&apos;ll keep {tierLabel} access until{' '}
                          {periodEnd ?? 'your billing period ends'}. After that, you&apos;ll move to
                          the free plan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {cancelling ? 'Cancelling\u2026' : 'Yes, cancel'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
          {cancelError && (
            <p className="text-sm text-destructive">{cancelError}</p>
          )}
        </CardContent>
      </Card>

      {subscription.tier !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/settings/billing/upgrade')}>
              Update payment method
            </Button>
          </CardContent>
        </Card>
      )}

      {subscription.tier !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-renewal</CardTitle>
            <CardDescription>
              {autoRenew
                ? `Your ${tierLabel} plan renews automatically${periodEnd ? ` on ${periodEnd}` : ''}.`
                : `Auto-renewal is off. Your ${tierLabel} access ends ${periodEnd ? `on ${periodEnd}` : 'at the end of your billing period'}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch
                id="auto-renew"
                checked={autoRenew}
                onCheckedChange={handleAutoRenewToggle}
                disabled={togglingAutoRenew || subscription.loading}
              />
              <Label htmlFor="auto-renew" className="cursor-pointer">
                {togglingAutoRenew ? 'Updating\u2026' : 'Automatically renew my subscription'}
              </Label>
            </div>
            {autoRenewError && (
              <p className="text-sm text-destructive">{autoRenewError}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
