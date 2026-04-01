import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PageShell({
  children,
  className,
  fullWidth = false
}: Readonly<{
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}>) {
  return (
    <div className={cn('min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64', className)}>
      <div className={cn('mx-auto px-4 py-8', fullWidth ? 'max-w-full' : 'max-w-5xl')}>
        {children}
      </div>
    </div>
  );
}
