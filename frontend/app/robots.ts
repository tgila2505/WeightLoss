import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://weightloss.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/blog/',
          '/plan/',
          '/results/',
          '/profile/',
        ],
        disallow: [
          '/dashboard',
          '/settings',
          '/tracking',
          '/reminders',
          '/interaction',
          '/lab-test',
          '/mindmap',
          '/user-profile',
          '/onboarding',
          '/onboarding-view',
          '/progress',
          '/referral',
          '/leaderboard',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
