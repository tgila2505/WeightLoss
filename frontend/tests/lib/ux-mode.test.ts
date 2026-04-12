import { vi } from 'vitest'
import { resolveUXMode, setUXPreference, clearUXPreference } from '@/lib/ux-mode'

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlags: vi.fn(),
}))

import { getFeatureFlags } from '@/lib/feature-flags'
const mockFlags = vi.mocked(getFeatureFlags)

const defaultFlags = {
  wizardEnabled: true,
  mindmapEnabled: true,
  abTestingEnabled: true,
  wizardRolloutPct: 100, // everyone gets wizard in A/B
  landingAbEnabled: false,
  landingAbRollout: 50,
  pricingUrgencyEnabled: false,
  abPricingIntervalEnabled: false,
  abPricingIntervalRollout: 0,
  abHeroPlanEnabled: false,
  abHeroPlanRollout: 0,
  seoAbEnabled: false,
  seoAbRollout: 50,
}

beforeEach(() => {
  mockFlags.mockReturnValue(defaultFlags)
  clearUXPreference()
})

describe('resolveUXMode', () => {
  it('returns mindmap when wizard is disabled by flag', () => {
    mockFlags.mockReturnValue({ ...defaultFlags, wizardEnabled: false })
    expect(resolveUXMode(1, null).mode).toBe('mindmap')
    expect(resolveUXMode(1, null).source).toBe('flag')
  })

  it('returns wizard when mindmap is disabled by flag', () => {
    mockFlags.mockReturnValue({ ...defaultFlags, mindmapEnabled: false })
    expect(resolveUXMode(1, null).mode).toBe('wizard')
    expect(resolveUXMode(1, null).source).toBe('flag')
  })

  it('respects URL override', () => {
    const result = resolveUXMode(1, 'mindmap')
    expect(result.mode).toBe('mindmap')
    expect(result.source).toBe('override')
  })

  it('respects user preference over A/B', () => {
    setUXPreference('mindmap')
    const result = resolveUXMode(1, null) // A/B would give wizard at 100%
    expect(result.mode).toBe('mindmap')
    expect(result.source).toBe('preference')
  })

  it('falls back to A/B when no preference or override', () => {
    const result = resolveUXMode(1, null)
    expect(result.source).toBe('ab_test')
  })

  it('returns mindmap default when A/B is disabled and no preference', () => {
    mockFlags.mockReturnValue({ ...defaultFlags, abTestingEnabled: false })
    const result = resolveUXMode(1, null)
    expect(result.mode).toBe('mindmap')
    expect(result.source).toBe('default')
  })

  it('handles null userId gracefully', () => {
    const result = resolveUXMode(null, null)
    expect(result.mode).toBe('mindmap')
  })
})
