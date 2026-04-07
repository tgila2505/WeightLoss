import { getFeatureFlag } from './posthog'

/**
 * Keys must match the PostHog feature flag names configured in the dashboard.
 */
export type ExperimentKey =
  | 'paywall-timing'   // variants: 'after-plan' (default) | 'before-plan'
  | 'pricing-variant'  // variants: '9' (default) | '12' | '19'
  | 'headline-copy'    // variants: 'A' (default) | 'B'
  | 'cta-copy'         // variants: 'A' (default) | 'B'

export type ExperimentVariant = string | boolean | undefined

/**
 * Read a PostHog feature flag value for a named experiment.
 * Returns undefined when PostHog is not initialised or the key is unknown.
 */
export function getExperimentVariant(key: ExperimentKey): ExperimentVariant {
  return getFeatureFlag(key)
}

/**
 * Returns the active monthly price to display.
 * Defaults to $9 when PostHog is uninitialised or flag is absent.
 */
export function getPricingVariant(): 9 | 12 | 19 {
  const variant = getFeatureFlag('pricing-variant')
  if (variant === '12') return 12
  if (variant === '19') return 19
  return 9
}

/**
 * Returns whether to show the paywall before or after plan generation.
 * Defaults to 'after-plan'.
 */
export function getPaywallTiming(): 'before-plan' | 'after-plan' {
  const variant = getFeatureFlag('paywall-timing')
  return variant === 'before-plan' ? 'before-plan' : 'after-plan'
}
