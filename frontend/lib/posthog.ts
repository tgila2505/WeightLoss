import posthog from 'posthog-js'

/**
 * Initialise PostHog once per page load. Safe to call multiple times.
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is missing (dev without a key).
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  // posthog-js exposes __loaded after init; guard against double-init
  if ((posthog as unknown as { __loaded?: boolean }).__loaded) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,   // handled manually in PostHogProvider
    capture_pageleave: true,
    autocapture: false,        // explicit events only — no noisy DOM captures
    persistence: 'localStorage+cookie',
  })
}

/**
 * Fire a PostHog event. Silent no-op if PostHog is not initialised.
 */
export function captureEvent(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return
  posthog.capture(event, properties)
}

/**
 * Identify an authenticated user. Call after login.
 */
export function identifyUser(
  userId: number,
  traits: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return
  posthog.identify(String(userId), traits)
}

/**
 * Reset PostHog identity. Call on logout.
 */
export function resetUser(): void {
  if (typeof window === 'undefined') return
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return
  posthog.reset()
}

/**
 * Read a PostHog feature flag value (for A/B experiments).
 * Returns undefined when PostHog is not initialised or flag is unknown.
 */
export function getFeatureFlag(key: string): string | boolean | undefined {
  if (typeof window === 'undefined') return undefined
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return undefined
  const value = posthog.getFeatureFlag(key)
  return value ?? undefined
}
