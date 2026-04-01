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
          <h1 className="text-2xl font-bold text-slate-900">Daily breakdown</h1>
        </div>
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-slate-500">
            Generate a plan from the interaction page to see your meals and activities.
          </p>
          <Link
            href="/interaction"
            className="inline-flex items-center text-sm text-blue-600 hover:underline font-medium"
          >
            Go to interaction →
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Plan
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Daily breakdown</h1>
        <p className="text-sm text-slate-500 mt-1">
          Meals, activity, and actions from the latest generated plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meals */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              Nutrition
            </p>
            <CardTitle className="text-base mt-0.5">Meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.meals.map((meal) => (
              <div
                key={`${meal.meal}-${meal.name}`}
                className="rounded-lg bg-slate-50 border border-slate-100 p-3"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide capitalize">
                  {meal.meal}
                </p>
                <p className="text-sm text-slate-800 mt-1">{meal.name}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              Movement
            </p>
            <CardTitle className="text-base mt-0.5">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.activity.map((item) => (
              <div
                key={`${item.title}-${item.frequency}`}
                className="rounded-lg bg-slate-50 border border-slate-100 p-3"
              >
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.frequency}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Checklist */}
        <Checklist
          title="Action checklist"
          items={[
            ...plan.behavioral_actions.map((item) => ({
              name: item,
              itemType: 'behavioral_action'
            })),
            ...plan.recommendations.map((item) => ({
              name: item,
              itemType: 'recommendation'
            }))
          ]}
        />
      </div>
    </PageShell>
  );
}
