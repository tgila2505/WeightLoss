'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { PlanSnapshot } from '../../lib/api-client';
import { Checklist } from './checklist';
import { PageShell } from './page-shell';

export function PlanView({
  plan
}: Readonly<{
  plan: PlanSnapshot | null;
}>) {
  if (!plan) {
    return (
      <PageShell>
        <div className="mb-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Plan
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Today's breakdown</h1>
        </div>
        <div className="text-center py-12 space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
            Pro feature
          </div>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            AI-generated meal and activity plans require a Pro subscription. Upgrade to unlock personalised daily plans.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/settings/billing"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade to Pro →
            </Link>
            <Link
              href="/interaction"
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              Already Pro? Generate a plan from the interaction page
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // Take only today's meals (first "day" worth — until meal type resets)
  const todayMeals = getTodayMeals(plan.meals);

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Plan
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Today's breakdown</h1>
        <p className="text-sm text-slate-500 mt-2">
          Today's meals, activity checklist, and key actions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Meals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Nutrition
                </p>
                <CardTitle className="text-base mt-0.5">Today's meals</CardTitle>
              </div>
              <Link
                href="/plan/meals"
                className="text-xs text-blue-500 hover:underline font-medium flex-shrink-0 mt-0.5"
              >
                7-day plan →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayMeals.map((meal) => (
              <div
                key={`${meal.meal}-${meal.name}`}
                className="rounded-lg bg-slate-50 border border-slate-100 p-4"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide capitalize">
                  {meal.meal}
                </p>
                <p className="text-sm text-slate-800 mt-1">{meal.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's Activity — checklist */}
        <Checklist
          title="Today's activity"
          label="Movement"
          items={plan.activity.map((item) => ({
            name: item.title,
            subtitle: item.frequency,
            itemType: 'activity',
          }))}
        />

        {/* Action checklist — spans both tablet columns to avoid orphaned half-row */}
        <div className="md:col-span-2 lg:col-span-1">
          <Checklist
            title="Action checklist"
            items={[
              ...plan.behavioral_actions.map((item) => ({
                name: item,
                itemType: 'behavioral_action',
              })),
              ...plan.recommendations.map((item) => ({
                name: item,
                itemType: 'recommendation',
              })),
            ]}
          />
        </div>
      </div>
    </PageShell>
  );
}

/** Returns only the first day's meals (stops when a meal type repeats). */
function getTodayMeals(
  meals: Array<{ meal: string; name: string }>,
): Array<{ meal: string; name: string }> {
  const seen = new Set<string>();
  const result: Array<{ meal: string; name: string }> = [];

  for (const meal of meals) {
    const type = meal.meal.toLowerCase();
    if (seen.has(type)) break;
    seen.add(type);
    result.push(meal);
  }

  return result;
}
