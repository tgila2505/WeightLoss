import { describe, expect, it } from 'vitest'
import { buildHowToSchema } from '@/lib/seo/schema'

describe('buildHowToSchema', () => {
  it('returns correct @type and step count', () => {
    const schema = buildHowToSchema('Lose Weight', 'A guide', [
      { name: 'Step 1', text: 'Calculate your TDEE' },
      { name: 'Step 2', text: 'Set a 500 kcal deficit' },
    ])
    expect(schema['@type']).toBe('HowTo')
    expect((schema.step as unknown[]).length).toBe(2)
  })

  it('assigns sequential positions', () => {
    const schema = buildHowToSchema('Test', 'desc', [
      { name: 'A', text: 'a' },
      { name: 'B', text: 'b' },
    ])
    const steps = schema.step as Array<{ position: number }>
    expect(steps[0].position).toBe(1)
    expect(steps[1].position).toBe(2)
  })

  it('includes name and description at top level', () => {
    const schema = buildHowToSchema('My Plan', 'My desc', [])
    expect(schema.name).toBe('My Plan')
    expect(schema.description).toBe('My desc')
  })
})
