'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Container } from '@/components/ui/container';
import { trackFunnelEvent } from '@/lib/analytics';
import {
  type FunnelPreview,
  fetchFunnelPreview,
  getFunnelProfile
} from '@/lib/funnel-session';
import { FunnelShell } from '../components/funnel-shell';
import { CountdownTimer } from './components/countdown-timer';
import { LockedPlanPreview } from './components/locked-plan-preview';
import { PlanPreviewCard } from './components/plan-preview-card';

export default function FunnelPreviewPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<FunnelPreview | null>(null);
  const [error] = useState('');

  useEffect(() => {
    fetchFunnelPreview()
      .then((data) => {
        setPreview(data);
        trackFunnelEvent('preview_viewed');
      })
      .catch(() => {
        router.replace('/funnel/start');
      });
  }, [router]);

  const profile = getFunnelProfile();
  const name = preview?.name ?? profile?.name ?? '';

  if (error) {
    return (
      <FunnelShell>
        <Container size="sm">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        </Container>
      </FunnelShell>
    );
  }

  return (
    <FunnelShell>
      <Container size="sm">
        <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
          <div>
            <p className="text-sm font-medium text-blue-600">Your free preview</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {name ? `Here's ${name}'s metabolic baseline` : 'Your metabolic baseline'}
            </h1>
            {preview && name && (
              <p className="mt-2 text-sm text-slate-500">
                {name}, to reach {preview.goal_weight_kg}kg in {preview.timeline_weeks}{' '}
                weeks, you need:
              </p>
            )}
          </div>

          {preview ? (
            <>
              <PlanPreviewCard preview={preview} />
              <CountdownTimer />
              <LockedPlanPreview />
            </>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          )}
        </div>
      </Container>
    </FunnelShell>
  );
}
