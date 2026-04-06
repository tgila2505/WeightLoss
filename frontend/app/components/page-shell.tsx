import type { ReactNode } from 'react';

import { Container } from '@/components/ui/container';
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
    <div className={cn('min-h-screen bg-muted/30 pb-20 md:pb-0 md:pl-64', className)}>
      <Container size={fullWidth ? 'full' : 'lg'} className="py-8">
        {children}
      </Container>
    </div>
  );
}
