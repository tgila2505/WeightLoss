'use client'

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trackFunnelEvent } from '@/lib/analytics'
import { convertFunnelSession } from '@/lib/funnel-session'
import { getStripe } from '@/lib/stripe-client'
import { setAccessToken } from '@/lib/auth'

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')
    trackFunnelEvent('checkout_started')

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card input not ready')
      setLoading(false)
      return
    }

    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { email },
    })

    if (stripeError || !paymentMethod) {
      setError(stripeError?.message ?? 'Card error')
      setLoading(false)
      return
    }

    try {
      const accessToken = await convertFunnelSession({
        email,
        password,
        paymentMethodId: paymentMethod.id,
      })
      setAccessToken(accessToken)
      router.replace('/funnel/welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-zinc-300">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-zinc-300">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="At least 8 characters"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">Card details</Label>
        <div className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-3">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  '::placeholder': { color: '#71717a' },
                },
                invalid: { color: '#f87171' },
              },
            }}
          />
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" className="w-full text-base py-4 h-auto" disabled={loading || !stripe}>
        {loading ? 'Processing…' : 'Start free week → $9/mo after'}
      </Button>
      <p className="text-center text-zinc-600 text-xs">
        Card charged after 7-day trial · Cancel anytime
      </p>
    </form>
  )
}

export function UpgradeForm() {
  return (
    <Elements stripe={getStripe()}>
      <CheckoutForm />
    </Elements>
  )
}
