const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weightloss.app'

interface ArticleSchemaOptions {
  title: string
  description: string
  path: string
  publishedAt?: string
  author?: string
}

export function buildArticleSchema({
  title,
  description,
  path,
  publishedAt,
  author,
}: ArticleSchemaOptions): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${BASE_URL}${path}`,
    ...(publishedAt && { datePublished: publishedAt }),
    ...(author && {
      author: {
        '@type': 'Person',
        name: author,
      },
    }),
    publisher: {
      '@type': 'Organization',
      name: 'WeightLoss App',
      url: BASE_URL,
    },
  }
}

interface WebPageSchemaOptions {
  name: string
  description: string
  path: string
}

export function buildWebPageSchema({
  name,
  description,
  path,
}: WebPageSchemaOptions): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: `${BASE_URL}${path}`,
  }
}

interface BreadcrumbItem {
  name: string
  path: string
}

export function buildBreadcrumbSchema(
  breadcrumbs: BreadcrumbItem[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path}`,
    })),
  }
}

export function buildFaqSchema(
  faq: Array<{ q: string; a: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
  }
}

interface PersonSchemaOptions {
  name: string
  description: string
  path: string
}

export function buildPersonSchema({
  name,
  description,
  path,
}: PersonSchemaOptions): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description,
    url: `${BASE_URL}${path}`,
    memberOf: {
      '@type': 'Organization',
      name: 'WeightLoss App',
      url: BASE_URL,
    },
  }
}
