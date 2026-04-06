import { getABVariant } from '@/lib/ab-testing'

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
