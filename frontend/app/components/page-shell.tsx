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
    <div style={{ paddingLeft: '256px' }} className={cn('min-h-screen bg-slate-50', className)}>
      <div className={cn('mx-auto px-4 py-8', fullWidth ? 'max-w-full' : 'max-w-5xl')}>
        {children}
      </div>
    </div>
  );
}
