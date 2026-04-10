'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { trackFunnelEvent } from '@/lib/analytics';
import { CostAnchor } from './components/cost-anchor';
import { FeaturedPlans } from './components/featured-plans';
import { FunnelHero } from './components/funnel-hero';
import { FunnelShell } from './components/funnel-shell';
import { HowItWorks } from './components/how-it-works';
import { PlanCounter } from './components/social-proof/plan-counter';
import { TestimonialCard } from './components/social-proof/testimonial-card';
import { TransformationCard } from './components/social-proof/transformation-card';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    result: 'Lost 8kg in 10 weeks',
    quote:
      "I'd been guessing my calories for years. Getting an exact target changed everything."
  },
  {
    name: 'James T.',
    result: 'Down 12kg in 14 weeks',
    quote:
      "The macro split was the missing piece. I wasn't eating enough protein."
  },
  {
    name: 'Priya K.',
    result: 'Lost 6kg in 8 weeks',
    quote:
      'Simple, personalised, and actually worked. The meal plan saved me hours of planning.'
  }
];

export default function FunnelLandingPage() {
  useEffect(() => {
    trackFunnelEvent('landing_viewed');
  }, []);

  return (
    <FunnelShell
      headerAction={
        <Link
          href="/login"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          Log in
        </Link>
      }
    >
      <FunnelHero />

      <section className="border-y border-slate-200 bg-white/70">
        <Container
          size="lg"
          className="flex flex-wrap items-center justify-center gap-6 py-5 text-sm text-slate-500"
        >
          <PlanCounter />
          <span>Based on your biometrics</span>
          <span>No generic templates</span>
        </Container>
      </section>

      <HowItWorks />

      <section className="px-4 py-8">
        <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute right-5 top-5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Preview
          </div>
          <div className="pointer-events-none select-none blur-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Your 7-day meal plan
            </p>
            <div className="space-y-2">
              {[
                'Mon: Oat bowl + chicken salad',
                'Tue: Greek yoghurt + salmon wrap',
                'Wed: Eggs + steak + veggies'
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/75 backdrop-blur-sm">
            <div className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Locked
            </div>
            <p className="text-sm font-semibold text-slate-900">Unlock with Pro</p>
          </div>
        </div>
      </section>

      <CostAnchor />

      <section className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">
            Real results
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-blue-600">Average member progress</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Built from your numbers, not a generic template
            </h2>
          </div>
          <div className="space-y-4">
            <TransformationCard startWeight="92kg" currentWeight="81kg" weeks={14} />
            <TransformationCard startWeight="78kg" currentWeight="68kg" weeks={12} />
          </div>
        </div>
      </section>

      <FeaturedPlans />

      <section className="px-4 py-14">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-10 text-center shadow-lg shadow-blue-200/60 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
            Ready in under a minute
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            See your calorie target and macro split today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-blue-100 sm:text-base">
            Answer three quick questions and we will build the same kind of
            structured plan you see across the rest of WeightLoss.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-auto bg-white px-8 py-4 text-base font-semibold text-blue-700 hover:bg-blue-50"
          >
            <Link href="/funnel/start">
              See my calorie target
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white/75 px-6 py-8 text-center text-xs text-slate-500">
        <p>
          Copyright {new Date().getFullYear()} WeightLoss.{' '}
          <Link href="/login" className="font-medium text-slate-700 hover:text-blue-600">
            Log in
          </Link>
        </p>
      </footer>
    </FunnelShell>
  );
}
