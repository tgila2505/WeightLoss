import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { NavBarWrapper } from './components/nav-bar-wrapper';

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
        <NavBarWrapper />
        {children}
      </body>
    </html>
  );
}
