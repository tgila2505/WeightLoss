import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weightloss.app'

interface BuildMetadataOptions {
  title: string
  description: string
  path: string
  ogImage?: string
}

export function buildMetadata({
  title,
  description,
  path,
  ogImage,
}: BuildMetadataOptions): Metadata {
  const url = `${BASE_URL}${path}`
  const image = ogImage
    ? ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`
    : `${BASE_URL}/og-default.png`

  return {
    title,
    description,
    alternates: { canonical: url },
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
  }
}
