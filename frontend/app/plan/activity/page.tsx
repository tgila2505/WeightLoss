'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { PageShell } from '@/app/components/page-shell';
import { fetchTodayPlan, getLatestPlan, type PlanSnapshot } from '@/lib/api-client';

export default function ActivityPage() {
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;
    const session = getLatestPlan();
    if (session) { setPlan(session); return; }

    fetchTodayPlan()
      .then((p) => { if (isMounted) setPlan(p); })
      .catch(() => { if (isMounted) setPlan(null); });

    return () => { isMounted = false; };
  }, []);

  if (!plan) {
    return (
      <PageShell>
        <Header />
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-slate-500">
            No activity plan available. Generate one from the Chat page.
          </p>
          <Link href="/interaction" className="inline-flex items-center text-sm text-blue-600 hover:underline font-medium">
            Generate a plan →
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Header />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plan.activity.map((item, idx) => (
          <ActivityCard
            key={`${item.title}-${idx}`}
            title={item.title}
            frequency={item.frequency}
          />
        ))}
      </div>
    </PageShell>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/plan" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← Today's breakdown
        </Link>
      </div>
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
        Movement
      </p>
      <h1 className="text-2xl font-bold text-slate-900">Activity Plan</h1>
      <p className="text-sm text-slate-500 mt-1">
        Your recommended activities with suggested frequency.
      </p>
    </div>
  );
}

function ActivityCard({
  title,
  frequency,
}: Readonly<{ title: string; frequency: string }>) {
  const { emoji, bg, label } = getActivityVisual(title);

  return (
    <Card className="overflow-hidden">
      {/* Illustration area */}
      <div className={`${bg} flex flex-col items-center justify-center py-10 gap-2`}>
        <span className="text-6xl" role="img" aria-label={title}>{emoji}</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <CardContent className="pt-4 pb-5 space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{frequency}</p>
      </CardContent>
    </Card>
  );
}

interface ActivityVisual {
  emoji: string;
  bg: string;
  label: string;
}

function getActivityVisual(title: string): ActivityVisual {
  const t = title.toLowerCase();

  if (t.includes('walk')) return { emoji: '🚶', bg: 'bg-green-50', label: 'Walking' };
  if (t.includes('run') || t.includes('jog')) return { emoji: '🏃', bg: 'bg-orange-50', label: 'Running' };
  if (t.includes('swim')) return { emoji: '🏊', bg: 'bg-blue-50', label: 'Swimming' };
  if (t.includes('cycl') || t.includes('bike') || t.includes('bicycl')) return { emoji: '🚴', bg: 'bg-yellow-50', label: 'Cycling' };
  if (t.includes('yoga')) return { emoji: '🧘', bg: 'bg-purple-50', label: 'Yoga' };
  if (t.includes('weight') || t.includes('lift') || t.includes('strength')) return { emoji: '🏋️', bg: 'bg-red-50', label: 'Strength' };
  if (t.includes('stretch')) return { emoji: '🤸', bg: 'bg-pink-50', label: 'Stretching' };
  if (t.includes('garden')) return { emoji: '🌱', bg: 'bg-emerald-50', label: 'Gardening' };
  if (t.includes('household') || t.includes('chore') || t.includes('clean')) return { emoji: '🏠', bg: 'bg-slate-100', label: 'Household' };
  if (t.includes('danc') || t.includes('zumba')) return { emoji: '💃', bg: 'bg-fuchsia-50', label: 'Dancing' };
  if (t.includes('hik')) return { emoji: '🥾', bg: 'bg-lime-50', label: 'Hiking' };
  if (t.includes('sport') || t.includes('tennis') || t.includes('badminton')) return { emoji: '🎾', bg: 'bg-amber-50', label: 'Sport' };
  if (t.includes('meditat')) return { emoji: '🧠', bg: 'bg-indigo-50', label: 'Meditation' };

  return { emoji: '⚡', bg: 'bg-blue-50', label: 'Activity' };
}
