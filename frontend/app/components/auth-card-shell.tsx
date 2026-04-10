import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { LogoMark } from './logo';

export function AuthCardShell({
  title,
  description,
  children
}: Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,1))]" />
      <Card className="relative w-full max-w-md border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur">
        <CardHeader className="pb-4 text-center">
          <LogoMark size="md" className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-slate-900">{title}</CardTitle>
          <CardDescription className="text-slate-600">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">{children}</CardContent>
      </Card>
    </main>
  );
}
