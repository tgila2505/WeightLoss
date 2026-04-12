import { buildArticleSchema } from '@/lib/seo/schema'

// Direct unit tests for the Article schema that will be used in results/[slug]/page.tsx
// The page itself is a Next.js async server component — we test the schema builder directly

describe('Article schema for UGC result pages', () => {
  it('includes author Person node when display_name is provided', () => {
    const schema = buildArticleSchema({
      title: 'How John Lost 10kg in 12 Weeks',
      description: 'Real result: 10kg lost in 12 weeks.',
      path: '/results/john-lost-10kg-in-12-weeks',
      author: 'John',
    })
    expect(schema['@type']).toBe('Article')
    const author = schema.author as Record<string, unknown>
    expect(author['@type']).toBe('Person')
    expect(author.name).toBe('John')
  })

  it('includes publisher Organization node', () => {
    const schema = buildArticleSchema({
      title: 'T',
      description: 'd',
      path: '/results/x',
    })
    const publisher = schema.publisher as Record<string, unknown>
    expect(publisher['@type']).toBe('Organization')
    expect(publisher.name).toBe('WeightLoss App')
  })

  it('omits author key when display_name is null', () => {
    const schema = buildArticleSchema({
      title: 'T',
      description: 'd',
      path: '/results/x',
      author: undefined,
    })
    expect(schema.author).toBeUndefined()
  })
})
