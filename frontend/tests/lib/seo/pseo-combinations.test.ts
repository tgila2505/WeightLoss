import { describe, expect, it } from 'vitest'
import {
  DIET_TYPES,
  GOAL_TYPES,
  buildPseoDescription,
  buildPseoH1,
  buildPseoSlug,
  getCoreSlugList,
} from '@/lib/seo/pseo-combinations'

describe('GOAL_TYPES and DIET_TYPES', () => {
  it('GOAL_TYPES is a non-empty array of strings', () => {
    expect(Array.isArray(GOAL_TYPES)).toBe(true)
    expect(GOAL_TYPES.length).toBeGreaterThan(0)
    expect(typeof GOAL_TYPES[0]).toBe('string')
  })

  it('DIET_TYPES is a non-empty array of strings', () => {
    expect(Array.isArray(DIET_TYPES)).toBe(true)
    expect(DIET_TYPES.length).toBeGreaterThan(0)
    expect(typeof DIET_TYPES[0]).toBe('string')
  })
})

describe('getCoreSlugList', () => {
  it('returns an array of PseoDimensions', () => {
    const list = getCoreSlugList()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
  })

  it('includes goal-only entries (no dietType)', () => {
    const list = getCoreSlugList()
    const goalOnly = list.filter((d) => !d.dietType)
    expect(goalOnly.length).toBe(GOAL_TYPES.length)
  })

  it('includes goal+diet combinations', () => {
    const list = getCoreSlugList()
    const combos = list.filter((d) => d.dietType)
    expect(combos.length).toBe(GOAL_TYPES.length * DIET_TYPES.length)
  })

  it('total count is GOAL_TYPES * (DIET_TYPES + 1) for goal-only', () => {
    const list = getCoreSlugList()
    expect(list.length).toBe(GOAL_TYPES.length * (DIET_TYPES.length + 1))
  })

  it('each entry produces a valid slug via buildPseoSlug', () => {
    const list = getCoreSlugList()
    for (const dims of list) {
      const slug = buildPseoSlug(dims)
      expect(typeof slug).toBe('string')
      expect(slug.length).toBeGreaterThan(0)
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})

describe('buildPseoDescription', () => {
  it('returns a non-empty string for goal-only', () => {
    const desc = buildPseoDescription({ goalType: 'lose-weight' })
    expect(typeof desc).toBe('string')
    expect(desc.length).toBeGreaterThan(20)
  })

  it('includes diet name when dietType provided', () => {
    const desc = buildPseoDescription({ goalType: 'lose-weight', dietType: 'keto' })
    expect(desc.toLowerCase()).toContain('keto')
  })

  it('returns different descriptions for different goals', () => {
    const a = buildPseoDescription({ goalType: 'lose-weight' })
    const b = buildPseoDescription({ goalType: 'get-lean' })
    expect(a).not.toBe(b)
  })
})

describe('buildPseoH1', () => {
  it('returns a non-empty string for goal-only', () => {
    const h1 = buildPseoH1({ goalType: 'lose-weight' })
    expect(typeof h1).toBe('string')
    expect(h1.length).toBeGreaterThan(5)
  })

  it('includes diet name when dietType provided', () => {
    const h1 = buildPseoH1({ goalType: 'lose-weight', dietType: 'keto' })
    expect(h1.toLowerCase()).toContain('keto')
  })

  it('returns different h1s for different goals', () => {
    const a = buildPseoH1({ goalType: 'lose-weight' })
    const b = buildPseoH1({ goalType: 'get-lean' })
    expect(a).not.toBe(b)
  })
})
