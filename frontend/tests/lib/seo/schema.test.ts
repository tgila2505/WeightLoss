import { buildArticleSchema, buildFaqSchema, buildWebPageSchema, buildBreadcrumbSchema, buildHowToSchema } from '@/lib/seo/schema'

describe('buildArticleSchema', () => {
  it('outputs correct @type and headline', () => {
    const s = buildArticleSchema({ title: 'Test Title', description: 'desc', path: '/test' })
    expect(s['@type']).toBe('Article')
    expect(s.headline).toBe('Test Title')
  })

  it('includes author Person node when author provided', () => {
    const s = buildArticleSchema({ title: 'T', description: 'd', path: '/t', author: 'Jane' })
    expect((s.author as Record<string, unknown>)['@type']).toBe('Person')
    expect((s.author as Record<string, unknown>).name).toBe('Jane')
  })

  it('omits author when not provided', () => {
    const s = buildArticleSchema({ title: 'T', description: 'd', path: '/t' })
    expect(s.author).toBeUndefined()
  })
})

describe('buildFaqSchema', () => {
  it('outputs correct @type', () => {
    const s = buildFaqSchema([{ q: 'Q?', a: 'A.' }])
    expect(s['@type']).toBe('FAQPage')
  })

  it('maps questions correctly', () => {
    const s = buildFaqSchema([{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }])
    const entities = s.mainEntity as Array<Record<string, unknown>>
    expect(entities).toHaveLength(2)
    expect(entities[0].name).toBe('Q1?')
  })
})

describe('buildWebPageSchema', () => {
  it('outputs correct @type', () => {
    const s = buildWebPageSchema({ name: 'N', description: 'D', path: '/n' })
    expect(s['@type']).toBe('WebPage')
  })
})

describe('buildBreadcrumbSchema', () => {
  it('outputs sequential positions', () => {
    const s = buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Plan', path: '/plan' }])
    const items = s.itemListElement as Array<Record<string, unknown>>
    expect(items[0].position).toBe(1)
    expect(items[1].position).toBe(2)
  })
})

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
