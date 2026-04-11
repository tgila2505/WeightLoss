import type { MetadataRoute } from 'next';
import { getCoreSlugList, buildPseoSlug } from '@/lib/seo/pseo-combinations';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://weightloss.app';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

async function fetchPublishedBlogSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/seo/blog/slugs`, {
      next: { revalidate: 3600, tags: ['sitemap', 'blog-posts'] },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slugs ?? [];
  } catch {
    return [];
  }
}

async function fetchPublicUgcSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/seo/ugc/slugs`, {
      next: { revalidate: 3600, tags: ['sitemap', 'ugc-pages'] },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.slugs ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  // pSEO plan pages
  const pseoPages: MetadataRoute.Sitemap = getCoreSlugList().map((dims) => ({
    url: `${BASE_URL}/plan/${buildPseoSlug(dims)}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Blog posts
  const blogSlugs = await fetchPublishedBlogSlugs();
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // UGC result pages
  const ugcSlugs = await fetchPublicUgcSlugs();
  const ugcPages: MetadataRoute.Sitemap = ugcSlugs.map((slug) => ({
    url: `${BASE_URL}/results/${slug}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // Public profile pages (same slugs as UGC, person-centered view)
  const profilePages: MetadataRoute.Sitemap = ugcSlugs.map((slug) => ({
    url: `${BASE_URL}/profile/${slug}`,
    lastModified: now,
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...pseoPages, ...blogPages, ...ugcPages, ...profilePages];
}
