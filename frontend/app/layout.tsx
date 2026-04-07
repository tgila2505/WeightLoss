import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { NavBarWrapper } from './components/nav-bar-wrapper';
import { PostHogProvider } from './components/providers/posthog-provider';
import { SubscriptionProvider } from '@/lib/subscription-context';

export const metadata: Metadata = {
  title: 'WeightLoss',
  description: 'WeightLoss — your personalised health companion'
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
      </body>
    </html>
  );
}
