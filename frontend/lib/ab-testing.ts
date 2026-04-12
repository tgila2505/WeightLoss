export type UXVariant = 'wizard' | 'mindmap'

// ---------------------------------------------------------------------------
// Phase 12 — pricing / paywall A/B experiments
// ---------------------------------------------------------------------------

export type PricingInterval = 'monthly' | 'annual'
export type HeroPlan = 'pro' | 'pro_plus'
export type PaywallModalStyle = 'feature' | 'outcome'
export type CtaCopyVariant = 'unlock' | 'trial'

/** Pricing interval experiment — sessionStorage bucketed (anonymous users). */
export function getPricingIntervalVariant(enabled: boolean, rollout: number): PricingInterval {
  if (!enabled || typeof window === 'undefined') return 'annual'
  const stored = sessionStorage.getItem('_ab_pricing_interval')
  if (stored === 'monthly' || stored === 'annual') return stored
  const variant: PricingInterval = Math.random() * 100 < rollout ? 'monthly' : 'annual'
  sessionStorage.setItem('_ab_pricing_interval', variant)
  return variant
}

/** Hero plan experiment — sessionStorage bucketed. */
export function getHeroPlanVariant(enabled: boolean, rollout: number): HeroPlan {
  if (!enabled || typeof window === 'undefined') return 'pro_plus'
  const stored = sessionStorage.getItem('_ab_hero_plan')
  if (stored === 'pro' || stored === 'pro_plus') return stored
  const variant: HeroPlan = Math.random() * 100 < rollout ? 'pro' : 'pro_plus'
  sessionStorage.setItem('_ab_hero_plan', variant)
  return variant
}

/** Paywall modal style experiment. */
export function getPaywallModalStyleVariant(enabled: boolean): PaywallModalStyle {
  if (!enabled || typeof window === 'undefined') return 'feature'
  const stored = sessionStorage.getItem('_ab_paywall_style')
  if (stored === 'feature' || stored === 'outcome') return stored
  const variant: PaywallModalStyle = Math.random() < 0.5 ? 'feature' : 'outcome'
  sessionStorage.setItem('_ab_paywall_style', variant)
  return variant
}

// ---------------------------------------------------------------------------
// Phase 15.3 — SEO page CTA A/B experiment
// ---------------------------------------------------------------------------

export type SeoCtaVariant = 'control' | 'social_proof'

/**
 * SEO plan page CTA experiment.
 * control:      "Start for free →" (default)
 * social_proof: "Join 10,000+ people who've hit their goal →"
 * sessionStorage bucketed for anonymous users; disabled by default.
 */
export function getSeoCtaVariant(enabled: boolean, rollout: number): SeoCtaVariant {
  if (!enabled || typeof window === 'undefined') return 'control'
  const stored = sessionStorage.getItem('_ab_seo_cta')
  if (stored === 'control' || stored === 'social_proof') return stored as SeoCtaVariant
  const variant: SeoCtaVariant = Math.random() * 100 < rollout ? 'social_proof' : 'control'
  sessionStorage.setItem('_ab_seo_cta', variant)
  return variant
}

/**
 * djb2 hash adapted for numeric user IDs.
 * Returns a stable bucket 0–99 for a given userId.
 */
function userBucket(userId: number): number {
  let hash = 5381
  const str = String(userId)
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash | 0 // keep 32-bit integer
  }
  return Math.abs(hash) % 100
}

/**
 * Returns the UX variant for a user given a rollout percentage.
 * Assignment is sticky — same userId always maps to same variant.
 */
export function getABVariant(userId: number, rolloutPct: number): UXVariant {
  return userBucket(userId) < rolloutPct ? 'wizard' : 'mindmap'
}
