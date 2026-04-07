import { getAccessToken } from './auth'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type AnalyticsEventName =
  | 'profile_questionnaire_started'
  | 'wizard_step_completed'
  | 'wizard_step_dropped'
  | 'wizard_completed'
  | 'mindmap_node_completed'
  | 'profile_questionnaire_completed'
  | 'ux_mode_preference_set'
  | 'ux_mode_resolved'
  | 'ux_mode_switched'
  // funnel events
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
 * Fire-and-forget analytics event. Never throws — analytics failures must never break UX.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties: AnalyticsEventProperties,
): void {
  const payload = {
    event,
    userId: properties.userId ?? null,
    sessionId: sessionId(),
    uxMode: properties.uxMode,
    timestamp: new Date().toISOString(),
    properties,
  }

  const token = typeof window !== 'undefined' ? getAccessToken() : null

  fetch(`${apiBaseUrl}/api/v1/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[analytics] Event dropped:', event, err)
    }
  })
}

/**
 * Fire-and-forget funnel event. Sends to /funnel/events — no auth required.
 * Never throws.
 */
export function trackFunnelEvent(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown> = {},
): void {
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
