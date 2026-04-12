import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these server-only packages.
  // pdf-parse v2 depends on pdfjs-dist which uses dynamic workers and
  // native Node.js APIs that break when Webpack tries to bundle them.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],

  async redirects() {
    return [
      {
        source: '/progress',
        destination: '/tracking',
        permanent: false,
      },
    ];
  },

  /**
   * Cache-Control headers for crawl budget management.
   *
   * Goals:
   * - Tell search engine bots how often pages change → reduces unnecessary
   *   re-crawls of static pSEO pages and preserves crawl budget for fresh content.
   * - Serve stale content instantly via CDN while revalidation runs in background.
   *
   * Hierarchy (most specific first):
   *   pSEO plans  → 7-day cache (matches ISR revalidate = 604800)
   *   Blog posts  → 1-hour cache (matches ISR revalidate = 3600 set in blog page)
   *   UGC results → 24-hour cache (matches ISR revalidate = 86400)
   *   Profiles    → 24-hour cache (matches ISR revalidate = 86400)
   *   Sitemap     → 1-hour cache
   *   LLM indexes → 24-hour cache (matches route revalidate = 86400)
   *   API routes  → no-store (never cached, never indexed)
   */
  async headers() {
    return [
      // pSEO plan pages — 7-day cache aligns with ISR revalidation
      {
        source: '/plan/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      // Blog posts — 1-hour cache
      {
        source: '/blog/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // UGC results — 24-hour cache
      {
        source: '/results/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      // Public profiles — 24-hour cache
      {
        source: '/profile/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      // Sitemap — 1-hour cache
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=300',
          },
        ],
      },
      // LLM index files — 24-hour cache
      {
        source: '/(llms.txt|llms-full.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=3600',
          },
        ],
      },
      // API routes — never cache, never index
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
