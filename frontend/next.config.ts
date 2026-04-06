import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these server-only packages.
  // pdf-parse v2 depends on pdfjs-dist which uses dynamic workers and
  // native Node.js APIs that break when Webpack tries to bundle them.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
