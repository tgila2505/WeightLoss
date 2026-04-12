const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weightloss.app'

/**
 * Standalone Organization schema — used on pages that don't emit an Article
 * schema (which already embeds publisher). Adds publisher context for Google's
 * rich-result eligibility and AI search grounding.
 */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WeightLoss App',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo.png`,
    },
    sameAs: [
      `${BASE_URL}`,
    ],
  }
}

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

interface FaqItem {
  q: string
  a: string
}

export function buildFaqSchema(faqs: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a,
      },
    })),
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

interface HowToStep {
  name: string
  text: string
}

export function buildHowToSchema(
  name: string,
  description: string,
  steps: HowToStep[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
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

/**
 * SpeakableSpecification — marks page sections that AI assistants and voice
 * interfaces should use for summaries and spoken responses.
 * @param path  Page path (e.g. '/plan/lose-weight-keto')
 * @param cssSelectors  CSS selectors targeting the most informative sections
 */
export function buildSpeakableSchema(
  path: string,
  cssSelectors: string[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: `${BASE_URL}${path}`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  }
}
