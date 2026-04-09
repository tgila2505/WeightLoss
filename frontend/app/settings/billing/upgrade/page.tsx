'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TIER_LABELS: Record<string, string> = {
  pro: 'Pro',
  pro_plus: 'Pro+',
}

const PRICES: Record<string, Record<string, string>> = {
  pro: { monthly: '$9/mo', annual: '$79/yr' },
  pro_plus: { monthly: '$19/mo', annual: '$99/yr' },
}

function CheckoutForm({ tier, interval }: { tier: string; interval: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const tierLabel = TIER_LABELS[tier] ?? tier
  const priceLabel = PRICES[tier]?.[interval] ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card input not ready')
      setLoading(false)
      return
    }

    try {
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (pmError || !paymentMethod) {
        setError(pmError?.message ?? 'Payment failed')
        return
      }

      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/v1/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier, interval, payment_method_id: paymentMethod.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.detail ?? 'Subscription failed')
        return
      }

      router.push('/settings/billing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg border border-input bg-muted px-3 py-3 min-h-[44px]">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#fff',
                fontFamily: 'inherit',
                '::placeholder': { color: '#888' },
              },
              invalid: { color: '#f87171' },
            },
          }}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || !stripe} className="w-full">
        {loading ? 'Processing\u2026' : `Start ${tierLabel} \u2014 ${priceLabel}`}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Cancel anytime · 30-day money-back guarantee · SSL encrypted
      </p>
    </form>
  )
}

function UpgradeForm() {
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier') ?? 'pro'
  const interval = searchParams.get('interval') ?? 'monthly'

  const tierLabel = TIER_LABELS[tier] ?? tier
  const priceLabel = PRICES[tier]?.[interval] ?? ''

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Upgrade to {tierLabel} &mdash; {priceLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Elements stripe={getStripe()}>
            <CheckoutForm tier={tier} interval={interval} />
          </Elements>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BillingUpgradePage() {
  return (
    <Suspense>
      <UpgradeForm />
    </Suspense>
  )
}
