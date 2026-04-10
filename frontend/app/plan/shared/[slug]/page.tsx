'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Eye, Calendar, Share2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSharedPlan, type SharedPlanResponse } from '@/lib/api-client';

export default function SharedPlanPage() {
  const params = useParams<{ slug: string }>();
  const [plan, setPlan] = useState<SharedPlanResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.slug) return;
    fetchSharedPlan(params.slug)
      .then(setPlan)
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === 'PLAN_NOT_FOUND') {
          setNotFound(true);
        } else {
          setError('Failed to load this plan. Please try again.');
        }
      });
  }, [params.slug]);

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="space-y-2 text-center">
          <Share2 className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="text-xl font-bold text-slate-900">Plan not found</h1>
          <p className="text-sm text-slate-500">
            This shared plan may have expired or the link is incorrect.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          WeightLoss · Shared Plan
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!plan && !error && !notFound && <p className="text-sm text-slate-500">Loading…</p>}

      {plan && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(plan.created_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {plan.views} {plan.views === 1 ? 'view' : 'views'}
            </span>
            {plan.expires_at && (
              <span className="text-amber-600">
                Expires{' '}
                {new Date(plan.expires_at).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric',
                })}
              </span>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan details</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanDataRenderer data={plan.plan_data} />
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

function PlanDataRenderer({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="space-y-3 text-sm">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[160px_1fr] gap-2">
          <dt className="font-medium capitalize text-slate-600">
            {key.replace(/_/g, ' ')}
          </dt>
          <dd className="text-slate-800">
            {typeof value === 'object' && value !== null ? (
              <pre className="overflow-x-auto rounded bg-slate-50 p-2 text-xs">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
