'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { trackFunnelEvent } from '@/lib/analytics';
import { getFunnelVariants } from '@/lib/feature-flags';

const HEADLINES = {
  A: 'Your AI Metabolic Coach',
  B: 'Lose Weight With a Plan Built for Your Body'
};

const CTAS = {
  A: 'Get your plan for free',
  B: 'Calculate my calories now'
};

export function FunnelHero() {
  const [variants, setVariants] = useState({
    headline: 'A' as 'A' | 'B',
    cta: 'A' as 'A' | 'B'
  });

  useEffect(() => {
    const nextVariants = getFunnelVariants();
    setVariants(nextVariants);
    trackFunnelEvent('landing_variant_viewed', {
      headline_variant: nextVariants.headline,
      cta_variant: nextVariants.cta
    });
  }, []);

  return (
    <section className="px-4 pb-12 pt-12 sm:pt-16">
      <Container size="xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
              Personalised calorie target in 60 seconds
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {HEADLINES[variants.headline]}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600 lg:mx-0">
              Answer 3 questions and get a personalised calorie target, macro split, and
              a clear next step that fits the rest of the WeightLoss experience.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
              <Button asChild size="lg" className="h-auto px-8 py-4 text-base">
                <Link href="/funnel/start">
                  {CTAS[variants.cta]}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-slate-500">
                No credit card required. Free forever for calorie tracking.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Sample output</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  Ready today
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Daily calorie target</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">2,140 kcal</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Based on your current weight, goal, and activity level.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Protein', value: '161g' },
                    { label: 'Carbs', value: '214g' },
                    { label: 'Fat', value: '71g' }
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-center"
                    >
                      <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  Built from your biometrics so you can move straight into a structured
                  meal plan, coaching, and tracking flow.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
