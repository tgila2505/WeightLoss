import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://weightloss.app';

export function buildMetadata({
  title,
  description,
  path,
  noindex = false,
  ogImage,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  ogImage?: string;
}): Metadata {
  const url = `${BASE_URL}${path}`;
  const image = ogImage ?? `${BASE_URL}/api/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: 'WeightLoss App',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export function buildArticleMetadata({
  title,
  description,
  path,
  publishedAt,
  author,
  tags,
}: {
  title: string;
  description: string;
  path: string;
  publishedAt?: string;
  author?: string;
  tags?: string[];
}): Metadata {
  const base = buildMetadata({ title, description, path });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      ...(publishedAt && { publishedTime: publishedAt }),
      ...(author && { authors: [author] }),
      ...(tags && { tags }),
    },
  };
}
