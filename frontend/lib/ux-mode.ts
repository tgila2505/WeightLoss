import { getFeatureFlags } from './feature-flags'
import { getABVariant, type UXVariant } from './ab-testing'

export type { UXVariant }
export type UXModeSource = 'flag' | 'override' | 'preference' | 'ab_test' | 'default'

export interface UXModeResolution {
  mode: UXVariant
  source: UXModeSource
}

const UX_PREFERENCE_KEY = 'ux_mode_preference'

export function setUXPreference(mode: UXVariant): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(UX_PREFERENCE_KEY, mode)
  }
}

export function clearUXPreference(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(UX_PREFERENCE_KEY)
  }
}

export function getUXPreference(): UXVariant | null {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem(UX_PREFERENCE_KEY)
  return val === 'wizard' || val === 'mindmap' ? val : null
}

/**
 * Resolves which UX mode to show. Priority order:
 * 1. Feature flag hard-disable
 * 2. URL/dev override
 * 3. Explicit user preference
 * 4. A/B assignment (deterministic by userId)
 * 5. Default (mindmap)
 */
export function resolveUXMode(
  userId: number | null,
  urlOverride: string | null | undefined,
): UXModeResolution {
  const flags = getFeatureFlags()

  // 1. Feature flag — hard disables
  if (!flags.wizardEnabled && !flags.mindmapEnabled) {
    return { mode: 'mindmap', source: 'flag' } // safe fallback
  }
  if (!flags.wizardEnabled) return { mode: 'mindmap', source: 'flag' }
  if (!flags.mindmapEnabled) return { mode: 'wizard', source: 'flag' }

  // 2. URL override (dev/QA use: ?ux=wizard or ?ux=mindmap)
  if (urlOverride === 'wizard' || urlOverride === 'mindmap') {
    return { mode: urlOverride, source: 'override' }
  }

  // 3. User preference (explicit choice stored in localStorage)
  const pref = getUXPreference()
  if (pref) return { mode: pref, source: 'preference' }

  // 4. A/B assignment
  if (flags.abTestingEnabled && userId !== null) {
    const variant = getABVariant(userId, flags.wizardRolloutPct)
    return { mode: variant, source: 'ab_test' }
  }

  // 5. Default
  return { mode: 'wizard', source: 'default' }
}
