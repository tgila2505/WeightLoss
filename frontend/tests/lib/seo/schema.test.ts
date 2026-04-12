import { buildArticleSchema, buildFaqSchema, buildWebPageSchema, buildBreadcrumbSchema } from '@/lib/seo/schema'

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
