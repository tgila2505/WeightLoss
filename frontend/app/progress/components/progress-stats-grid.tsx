'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ProgressSummary } from '@/lib/api-client';

type Props = {
  summary: ProgressSummary;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-3 text-center">
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function ProgressStatsGrid({ summary }: Props) {
  const trendLabel = summary.trend_slope_14d !== null
    ? `${summary.trend_slope_14d > 0 ? '+' : ''}${summary.trend_slope_14d.toFixed(2)} kg/wk`
    : '—';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Lost so far"
        value={summary.total_lost_kg !== null ? `${summary.total_lost_kg} kg` : '—'}
      />
      <StatCard
        label="To goal"
        value={summary.goal_delta_kg !== null ? `${summary.goal_delta_kg} kg` : '—'}
      />
      <StatCard label="14d trend" value={trendLabel} />
      <StatCard
        label="Est. completion"
        value={summary.estimated_weeks_remaining !== null
          ? `~${summary.estimated_weeks_remaining} wks`
          : '—'}
      />
    </div>
  );
}
