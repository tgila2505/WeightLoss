export interface FeatureFlags {
  wizardEnabled: boolean
  mindmapEnabled: boolean
  abTestingEnabled: boolean
  wizardRolloutPct: number
  landingAbEnabled: boolean
  landingAbRollout: number
}

export function getFeatureFlags(): FeatureFlags {
  return {
    wizardEnabled: process.env.NEXT_PUBLIC_WIZARD_ENABLED === 'true',
    mindmapEnabled: process.env.NEXT_PUBLIC_MINDMAP_ENABLED !== 'false',
    abTestingEnabled: process.env.NEXT_PUBLIC_AB_TESTING_ENABLED === 'true',
    wizardRolloutPct: parseInt(process.env.NEXT_PUBLIC_WIZARD_ROLLOUT_PCT ?? '0', 10),
    landingAbEnabled: process.env.NEXT_PUBLIC_LANDING_AB_ENABLED === 'true',
    landingAbRollout: parseInt(process.env.NEXT_PUBLIC_LANDING_AB_ROLLOUT ?? '50', 10),
  }
}

export type FunnelVariants = {
  headline: 'A' | 'B'
  cta: 'A' | 'B'
}

const FUNNEL_AB_KEY = '_funnel_ab'

/**
 * Returns sticky A/B variants for the funnel landing page.
 * Assignment is per-session (sessionStorage). Server renders variant A.
 */
export function getFunnelVariants(): FunnelVariants {
  if (typeof window === 'undefined') return { headline: 'A', cta: 'A' }

  const stored = sessionStorage.getItem(FUNNEL_AB_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as FunnelVariants
    } catch {
      // fall through to reassign
    }
  }

  const flags = getFeatureFlags()
  const inVariantB = flags.landingAbEnabled && Math.random() * 100 < flags.landingAbRollout
  const variants: FunnelVariants = inVariantB
    ? { headline: 'B', cta: 'B' }
    : { headline: 'A', cta: 'A' }

  sessionStorage.setItem(FUNNEL_AB_KEY, JSON.stringify(variants))
  return variants
}
