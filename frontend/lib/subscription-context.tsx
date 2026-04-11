'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export interface CapabilityMap {
  meal_plan_full: boolean
  weekly_schedule: boolean
  profile_edit: boolean
  ai_plans: boolean
  coaching_insights: boolean
  goal_specific_plans: boolean
  advanced_coaching: boolean
  weekly_ai_report: boolean
}

export interface SubscriptionState {
  tier: 'free' | 'pro' | 'pro_plus'
  interval: 'monthly' | 'annual'
  status: string
  trial_active: boolean
  past_due: boolean
  cancel_at_period_end: boolean
  current_period_end: string | null
  capabilities: CapabilityMap
  loading: boolean
}

const defaultCaps: CapabilityMap = {
  meal_plan_full: false,
  weekly_schedule: false,
  profile_edit: false,
  ai_plans: false,
  coaching_insights: false,
  goal_specific_plans: false,
  advanced_coaching: false,
  weekly_ai_report: false,
}

const defaultState: SubscriptionState = {
  tier: 'free',
  interval: 'monthly',
  status: 'none',
  trial_active: false,
  past_due: false,
  cancel_at_period_end: false,
  current_period_end: null,
  capabilities: defaultCaps,
  loading: true,
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

const SubscriptionContext = createContext<SubscriptionState>(defaultState)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>(defaultState)

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null
    if (!token) {
      setState({ ...defaultState, loading: false })
      return
    }

    fetch(`${API_BASE}/api/v1/billing/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setState({ ...data, loading: false })
        } else {
          setState({ ...defaultState, loading: false })
        }
      })
      .catch(() => setState({ ...defaultState, loading: false }))
  }, [])

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function useHasCapability(capability: keyof CapabilityMap): boolean {
  const { capabilities, trial_active, tier } = useSubscription()
  if (trial_active && tier === 'free') {
    // Trial users get pro-equivalent access — all pro caps are true
    const proCaps: (keyof CapabilityMap)[] = [
      'meal_plan_full', 'weekly_schedule', 'profile_edit', 'ai_plans', 'coaching_insights',
    ]
    if (proCaps.includes(capability)) return true
  }
  return capabilities[capability]
}
