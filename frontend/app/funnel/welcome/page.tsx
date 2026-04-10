'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { trackFunnelEvent } from '@/lib/analytics';
import { clearFunnelSession, getFunnelProfile } from '@/lib/funnel-session';
import { FunnelShell } from '../components/funnel-shell';

export default function FunnelWelcomePage() {
  const profile = getFunnelProfile();

  useEffect(() => {
    trackFunnelEvent('conversion_completed');
    clearFunnelSession();
  }, []);

  return (
    <FunnelShell>
      <Container size="sm">
        <div className="flex flex-col items-center gap-8 rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-xl shadow-slate-200/70">
          <div className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              {profile?.name ? `You're in, ${profile.name}.` : "You're in."}
            </h1>
            <p className="text-slate-600">Your full plan is ready.</p>
          </div>
          <Button asChild size="lg" className="h-auto px-8 py-4 text-base">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
          <p className="text-sm text-slate-700">
            Your 7-day free trial has started. Unless you cancel first, billing begins at $9/month after the trial.
          </p>
        </div>
      </Container>
    </FunnelShell>
  );
}
