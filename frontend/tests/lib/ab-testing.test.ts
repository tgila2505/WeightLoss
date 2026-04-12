import { vi } from 'vitest'
import { getABVariant, getSeoCtaVariant } from '@/lib/ab-testing'

describe('getABVariant', () => {
  it('returns mindmap when rollout is 0', () => {
    expect(getABVariant(42, 0)).toBe('mindmap')
  })

  it('returns wizard when rollout is 100', () => {
    expect(getABVariant(42, 100)).toBe('wizard')
  })

  it('is deterministic — same userId always gets same variant', () => {
    const a = getABVariant(1001, 50)
    const b = getABVariant(1001, 50)
    expect(a).toBe(b)
  })

  it('distributes users across both buckets at 50%', () => {
    const results = Array.from({ length: 1000 }, (_, i) => getABVariant(i, 50))
    const wizardCount = results.filter((r) => r === 'wizard').length
    // Expect roughly 50%, allow ±10%
    expect(wizardCount).toBeGreaterThan(400)
    expect(wizardCount).toBeLessThan(600)
  })
})

describe('getSeoCtaVariant', () => {
  it('returns control when disabled', () => {
    expect(getSeoCtaVariant(false, 100)).toBe('control')
  })

  it('returns control when rollout is 0', () => {
    expect(getSeoCtaVariant(false, 0)).toBe('control')
  })

  it('returns social_proof when enabled and rollout is 100', () => {
    const storage: Record<string, string> = {}
    vi.stubGlobal('window', {})
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v },
    })
    expect(getSeoCtaVariant(true, 100)).toBe('social_proof')
    vi.unstubAllGlobals()
  })

  it('returns stored value without re-bucketing', () => {
    const storage: Record<string, string> = { _ab_seo_cta: 'social_proof' }
    vi.stubGlobal('window', {})
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v },
    })
    expect(getSeoCtaVariant(true, 0)).toBe('social_proof')
    vi.unstubAllGlobals()
  })
})
