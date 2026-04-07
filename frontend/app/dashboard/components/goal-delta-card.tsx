'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ProgressSummary } from '@/lib/api-client';

type Props = {
  summary: ProgressSummary | null;
};

export function GoalDeltaCard({ summary }: Props) {
  if (!summary || summary.goal_weight_kg === null || summary.start_weight_kg === null) {
    return null;
  }

  const {
    goal_weight_kg,
    start_weight_kg,
    current_weight_kg,
    total_lost_kg,
    goal_pct,
    estimated_weeks_remaining,
  } = summary;

  const pct = goal_pct ?? 0;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Your Goal: <span className="font-semibold text-slate-800">{goal_weight_kg} kg</span></span>
          <span className="text-slate-500">Start: <span className="font-semibold text-slate-800">{start_weight_kg} kg</span></span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{total_lost_kg !== null ? `${total_lost_kg} kg lost` : '—'}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Current: <span className="font-semibold text-slate-800">
              {current_weight_kg !== null ? `${current_weight_kg} kg` : '—'}
            </span>
          </span>
          {estimated_weeks_remaining !== null && (
            <span className="text-slate-500">
              Est. <span className="font-semibold text-slate-800">~{estimated_weeks_remaining} weeks</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
