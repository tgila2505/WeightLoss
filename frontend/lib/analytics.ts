import { captureEvent } from './posthog'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type AnalyticsEventName =
  // Onboarding
  | 'profile_questionnaire_started'
  | 'wizard_step_completed'
  | 'wizard_step_dropped'
  | 'wizard_completed'
  | 'mindmap_node_completed'
  | 'profile_questionnaire_completed'
  | 'ux_mode_preference_set'
  | 'ux_mode_resolved'
  | 'ux_mode_switched'
  // Core product
  | 'onboarding_completed'
  | 'plan_generated'
  | 'paywall_viewed'
  | 'subscription_started'
  // Funnel
  | 'landing_viewed'
  | 'landing_variant_viewed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_abandoned'
  | 'preview_viewed'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'conversion_completed'
  | 'trial_expired'
  | 'ugc_cta_clicked'

export interface AnalyticsEventProperties {
  userId?: number
  uxMode: 'wizard' | 'mindmap'
  [key: string]: unknown
}

let _sessionId: string | null = null

function sessionId(): string {
  if (_sessionId) return _sessionId
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('_analytics_sid')
    if (stored) {
      _sessionId = stored
      return _sessionId
    }
  }
  _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('_analytics_sid', _sessionId)
  }
  return _sessionId
}

/**
 * Fire-and-forget analytics event to backend + PostHog.
 * Never throws — analytics failures must never break UX.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties: AnalyticsEventProperties,
): void {
  const sid = sessionId()
  const payload = {
    event,
    userId: properties.userId ?? null,
    sessionId: sid,
    uxMode: properties.uxMode,
    timestamp: new Date().toISOString(),
    properties,
  }

  // 1. Fire to PostHog (primary analytics platform)
  captureEvent(event, { ...properties, session_id: sid })

  // 2. Fire to backend (source-of-truth + fallback)
  fetch(`${apiBaseUrl}/api/v1/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include' as RequestCredentials,
    body: JSON.stringify(payload),
  }).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[analytics] Event dropped:', event, err)
    }
  })
}

/**
 * Fire-and-forget funnel event to backend + PostHog.
 * No auth required (anonymous visitors).
 */
export function trackFunnelEvent(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown> = {},
): void {
  const sid = sessionId()

  // 1. Fire to PostHog
  captureEvent(eventName, { ...properties, session_id: sid, funnel: true })

  // 2. Fire to backend funnel endpoint
  fetch(`${apiBaseUrl}/api/v1/funnel/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ event_name: eventName, properties }),
  }).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[funnel-analytics] Event dropped:', eventName, err)
    }
  })
}
