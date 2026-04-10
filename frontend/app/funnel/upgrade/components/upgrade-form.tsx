'use client';

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setAccessToken } from '@/lib/auth';
import { trackFunnelEvent } from '@/lib/analytics';
import { convertFunnelSession } from '@/lib/funnel-session';
import { getStripe } from '@/lib/stripe-client';

const fieldClassName =
  'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500';

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');
    trackFunnelEvent('checkout_started');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card input not ready');
      setLoading(false);
      return;
    }

    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { email }
    });

    if (stripeError || !paymentMethod) {
      setError(stripeError?.message ?? 'Card error');
      setLoading(false);
      return;
    }

    try {
      const accessToken = await convertFunnelSession({
        email,
        password,
        paymentMethodId: paymentMethod.id
      });
      setAccessToken(accessToken);
      router.replace('/funnel/welcome');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClassName}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-700">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClassName}
          placeholder="At least 8 characters"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">Card details</Label>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#0f172a',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  '::placeholder': { color: '#94a3b8' }
                },
                invalid: { color: '#dc2626' }
              }
            }}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="h-auto w-full py-4 text-base" disabled={loading || !stripe}>
        {loading ? 'Processing...' : 'Start 7-day trial - then $9/month'}
      </Button>
      <p className="text-center text-xs text-slate-600">
        Your card is charged only after the 7-day trial unless you cancel first.
      </p>
    </form>
  );
}

export function UpgradeForm() {
  return (
    <Elements stripe={getStripe()}>
      <CheckoutForm />
    </Elements>
  );
}
