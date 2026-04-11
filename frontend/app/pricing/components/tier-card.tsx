'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TierCardProps {
  tier: 'free' | 'pro' | 'pro_plus'
  interval: 'monthly' | 'annual'
  onSelect: (tier: string, interval: string) => void
  currentTier?: string
}

const TIER_DATA = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthly: 0,
    features: [
      'Calorie + macro calculator',
      '7-day meal plan preview',
      'Basic weekly schedule',
    ],
    cta: 'Get started free',
    hero: false,
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 9,
    annualPrice: 79,
    annualMonthly: 6.58,
    features: [
      'Everything in Free',
      'Full 7-day meal plan',
      'Full weekly schedule',
      'Profile & settings edit',
      'AI-generated plans',
      'Coaching insights',
    ],
    cta: 'Start Pro',
    hero: false,
  },
  pro_plus: {
    name: 'Pro+',
    monthlyPrice: 19,
    annualPrice: 99,
    annualMonthly: 8.25,
    features: [
      'Everything in Pro',
      'Goal-specific protocols (Keto, PCOS, Muscle Gain)',
      'Advanced weekly AI coaching',
      'Weekly AI progress report (PDF)',
      'Priority support',
    ],
    cta: 'Start Pro+',
    hero: true,
  },
}

export function TierCard({ tier, interval, onSelect, currentTier }: TierCardProps) {
  const data = TIER_DATA[tier]
  const isHero = data.hero
  const isCurrent = currentTier === tier
  const price = interval === 'annual' && tier !== 'free' ? data.annualMonthly : data.monthlyPrice
  const billing =
    interval === 'annual' && tier !== 'free'
      ? `$${data.annualPrice}/yr billed annually`
      : tier === 'free'
        ? 'Free forever'
        : `$${data.monthlyPrice}/mo`

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-6 gap-4',
        isHero
          ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
          : 'border-border',
      )}
    >
      {isHero && (
        <div className="self-start rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          Most Popular
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold">{data.name}</h3>
        <div className="flex items-end gap-1 mt-1">
          {tier === 'free' ? (
            <span className="text-3xl font-bold">Free</span>
          ) : (
            <>
              <span className="text-3xl font-bold">${price.toFixed(2)}</span>
              <span className="text-muted-foreground text-sm mb-1">/mo</span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{billing}</p>
      </div>
      <ul className="flex flex-col gap-2 flex-1">
        {data.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        className="w-full"
        variant={isHero ? 'default' : 'outline'}
        disabled={isCurrent}
        onClick={() => tier !== 'free' && onSelect(tier, interval)}
      >
        {isCurrent ? 'Current plan' : data.cta}
      </Button>
      {tier !== 'free' && (
        <p className="text-center text-xs text-muted-foreground">
          {interval === 'annual'
            ? 'Billed annually · Auto-renews each year'
            : 'Cancel anytime · No contracts'}
        </p>
      )}
    </div>
  )
}
