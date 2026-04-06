import { getFeatureFlags } from '@/lib/feature-flags'

describe('getFeatureFlags', () => {
  it('returns mindmap-only when wizard is not enabled', () => {
    process.env.NEXT_PUBLIC_WIZARD_ENABLED = 'false'
    process.env.NEXT_PUBLIC_MINDMAP_ENABLED = 'true'
    const flags = getFeatureFlags()
    expect(flags.wizardEnabled).toBe(false)
    expect(flags.mindmapEnabled).toBe(true)
  })

  it('defaults mindmap to enabled when env var is absent', () => {
    delete process.env.NEXT_PUBLIC_WIZARD_ENABLED
    delete process.env.NEXT_PUBLIC_MINDMAP_ENABLED
    const flags = getFeatureFlags()
    expect(flags.mindmapEnabled).toBe(true)
    expect(flags.wizardEnabled).toBe(false)
  })

  it('reads rollout percentage', () => {
    process.env.NEXT_PUBLIC_WIZARD_ROLLOUT_PCT = '30'
    const flags = getFeatureFlags()
    expect(flags.wizardRolloutPct).toBe(30)
  })
})
