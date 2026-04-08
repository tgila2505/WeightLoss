const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type FunnelProfile = {
  name: string
  age: number
  gender: string
  height_cm: number
  weight_kg: number
  goal_weight_kg: number
  timeline_weeks: number
  health_conditions: string
  activity_level: string
  diet_pattern: string
}

const FUNNEL_PROFILE_KEY = '_funnel_profile'

export function saveFunnelProfile(profile: FunnelProfile): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(FUNNEL_PROFILE_KEY, JSON.stringify(profile))
}

export function getFunnelProfile(): FunnelProfile | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem(FUNNEL_PROFILE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as FunnelProfile
  } catch {
    return null
  }
}

export function clearFunnelSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(FUNNEL_PROFILE_KEY)
  sessionStorage.removeItem('_funnel_ab')
}

export async function createFunnelSession(profile: FunnelProfile): Promise<void> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? 'Failed to create session')
  }
  saveFunnelProfile(profile)
}

export type FunnelPreview = {
  name: string
  goal_weight_kg: number
  timeline_weeks: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  deficit_rate: number
  weekly_loss_kg_estimate: number
}

export async function fetchFunnelPreview(): Promise<FunnelPreview> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/preview`, {
    credentials: 'include',
  })
  if (!resp.ok) {
    throw new Error('No session — please complete onboarding first')
  }
  return (await resp.json()) as FunnelPreview
}

export async function convertFunnelSession(payload: {
  email: string
  password: string
  paymentMethodId: string
}): Promise<string> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      payment_method_id: payload.paymentMethodId,
    }),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? 'Checkout failed')
  }
  const data = (await resp.json()) as { access_token: string }
  return data.access_token
}

export async function fetchFunnelStats(): Promise<{ plans_generated: number }> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/stats`)
  if (!resp.ok) return { plans_generated: 14280 }
  return (await resp.json()) as { plans_generated: number }
}
