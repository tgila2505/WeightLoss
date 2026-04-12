import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://weightloss.app';

const PUBLIC_ALLOW = ['/', '/blog/', '/plan/', '/results/', '/profile/', '/llms.txt', '/llms-full.txt'];
const PRIVATE_DISALLOW = [
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
];

// AI crawlers explicitly welcomed on all public content and LLM index files
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Googlebot-Extended',
  'Applebot-Extended',
  'anthropic-ai',
  'cohere-ai',
  'Omgilibot',
  'Bytespider',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
