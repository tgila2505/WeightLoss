import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { NavBarWrapper } from './components/nav-bar-wrapper';
import { SpeedInsights } from './components/speed-insights';
import { PostHogProvider } from './components/providers/posthog-provider';
import { SubscriptionProvider } from '@/lib/subscription-context';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weightloss.app';

export const metadata: Metadata = {
  title: {
    default: 'WeightLoss — AI Metabolic Coach',
    template: '%s | WeightLoss',
  },
  description: 'WeightLoss — your personalised AI health companion for sustainable weight loss.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: 'website',
    siteName: 'WeightLoss App',
    title: 'WeightLoss — AI Metabolic Coach',
    description: 'WeightLoss — your personalised AI health companion for sustainable weight loss.',
    url: BASE_URL,
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeightLoss — AI Metabolic Coach',
    description: 'WeightLoss — your personalised AI health companion for sustainable weight loss.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  other: {
    'script:ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'WeightLoss App',
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
    }),
  },
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <PostHogProvider>
          <SubscriptionProvider>
            <NavBarWrapper />
            {children}
          </SubscriptionProvider>
        </PostHogProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
