const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://weightloss.app';

export function buildWebPageSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: `${BASE_URL}${path}`,
    publisher: {
      '@type': 'Organization',
      name: 'WeightLoss App',
      url: BASE_URL,
    },
  };
}

export function buildArticleSchema({
  title,
  description,
  path,
  author,
  publishedAt,
  modifiedAt,
}: {
  title: string;
  description: string;
  path: string;
  author?: string;
  publishedAt?: string;
  modifiedAt?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${BASE_URL}${path}`,
    ...(publishedAt && { datePublished: publishedAt }),
    ...(modifiedAt && { dateModified: modifiedAt }),
    author: {
      '@type': 'Person',
      name: author ?? 'WeightLoss App Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'WeightLoss App',
      url: BASE_URL,
    },
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, path }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${BASE_URL}${path}`,
    })),
  };
}
