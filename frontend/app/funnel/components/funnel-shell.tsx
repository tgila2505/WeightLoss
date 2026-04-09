import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoMark, LogoText } from '@/app/components/logo';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/utils';

export function FunnelShell({
  children,
  className,
  contentClassName,
  headerAction
}: Readonly<{
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerAction?: ReactNode;
}>) {
  return (
    <main
      className={cn(
        'relative min-h-screen overflow-hidden bg-slate-50 text-slate-900',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,1))]" />
      <header className="relative border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <Container
          size="xl"
          className="flex items-center justify-between gap-4 py-4"
        >
          <Link
            href="/funnel"
            className="flex items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-slate-100/80"
          >
            <LogoMark size="sm" />
            <LogoText size="sm" />
          </Link>
          {headerAction}
        </Container>
      </header>
      <div className={cn('relative py-10 md:py-14', contentClassName)}>
        {children}
      </div>
    </main>
  );
}
