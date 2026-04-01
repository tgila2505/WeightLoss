'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { PageShell } from './page-shell';
import type {
  HealthMetricResponse,
  LabRecordResponse,
  PlanSnapshot,
  ProfileResponse
} from '../../lib/api-client';

export function DashboardView({
  profile,
  metrics,
  labs,
  plan
}: Readonly<{
  profile: ProfileResponse | null;
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  plan: PlanSnapshot | null;
}>) {
  const latestMetric = metrics[0] ?? null;
  const alerts = [
    ...labs
      .filter((lab) => lab.evaluation.is_abnormal)
      .slice(0, 3)
      .map((lab) => `${lab.test_name}: ${lab.evaluation.status}`),
    ...(plan?.recommendations.slice(0, 2) ?? [])
  ];

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {profile?.name ? `${profile.name}'s overview` : 'Today overview'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your latest plan, key metrics, and alerts in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Right column — Metrics & Alerts */}
        <div className="lg:order-2 space-y-4">
          {/* Metrics card */}
          <Card>
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Metrics
              </p>
              <CardTitle className="text-base mt-0.5">Key numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {latestMetric ? (
                <>
                  <MetricRow
                    label="Weight"
                    value={`${latestMetric.weight_kg} kg`}
                    accent
                  />
                  <MetricRow
                    label="BMI"
                    value={`${latestMetric.bmi ?? latestMetric.processed.derived_bmi ?? '—'}`}
                  />
                  <MetricRow
                    label="Steps"
                    value={`${latestMetric.steps ?? '—'}`}
                  />
                  <MetricRow
                    label="Sleep"
                    value={`${latestMetric.sleep_hours ?? '—'} h`}
                    last
                  />
                </>
              ) : (
                <p className="text-sm text-slate-500">No health metrics available yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts card */}
          <Card>
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Alerts
              </p>
              <CardTitle className="text-base mt-0.5">Flags & reminders</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <ul className="space-y-2">
                  {alerts.map((alert) => (
                    <li key={alert} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      {alert}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No current alerts.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Left column — Plan */}
        <Card className="lg:order-1">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Today
                </p>
                <CardTitle className="text-base mt-0.5">Current plan</CardTitle>
              </div>
              <Link
                href="/plan"
                className="text-xs text-blue-600 hover:underline font-medium flex-shrink-0 mt-0.5"
              >
                Full breakdown →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {plan ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PlanBlock
                  title="Meals"
                  items={plan.meals.map((meal) => {
                    const shortName = meal.name.split(':')[0].trim();
                    return `${meal.meal}: ${shortName}`;
                  })}
                />
                <PlanBlock
                  title="Activity"
                  items={plan.activity.map((item) => `${item.title}: ${item.frequency}`)}
                />
                <PlanBlock
                  title="Key actions"
                  items={plan.behavioral_actions.slice(0, 3)}
                />
              </div>
            ) : (
              <EmptyState
                text="No plan generated in this session yet."
                actionHref="/interaction"
                actionLabel="Generate a plan"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function MetricRow({
  label,
  value,
  accent = false,
  last = false
}: Readonly<{
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}>) {
  return (
    <>
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm text-slate-500">{label}</span>
        <span
          className={
            accent
              ? 'text-sm font-bold text-teal-600'
              : 'text-sm font-semibold text-slate-900'
          }
        >
          {value}
        </span>
      </div>
      {!last ? <Separator /> : null}
    </>
  );
}

function PlanBlock({
  title,
  items
}: Readonly<{
  title: string;
  items: string[];
}>) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-slate-700 leading-snug line-clamp-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({
  text,
  actionHref,
  actionLabel
}: Readonly<{
  text: string;
  actionHref: string;
  actionLabel: string;
}>) {
  return (
    <div className="text-center py-6 space-y-3">
      <p className="text-sm text-slate-500">{text}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center text-sm text-blue-600 hover:underline font-medium"
      >
        {actionLabel} →
      </Link>
    </div>
  );
}
