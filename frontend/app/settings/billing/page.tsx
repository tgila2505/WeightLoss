'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/lib/subscription-context'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

export default function BillingSettingsPage() {
  const subscription = useSubscription()
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)

  const tierLabel =
    subscription.tier === 'pro_plus' ? 'Pro+' : subscription.tier === 'pro' ? 'Pro' : 'Free'
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null

  async function handleCancel() {
    setCancelling(true)
    try {
      const token = localStorage.getItem('access_token')
      await fetch(`${API_BASE}/api/v1/billing/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      router.refresh()
    } finally {
      setCancelling(false)
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
    </div>
  )
}
