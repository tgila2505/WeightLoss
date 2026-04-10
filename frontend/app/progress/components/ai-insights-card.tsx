'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyReport } from '@/lib/api-client';

type Props = {
  report: WeeklyReport | null;
};

export function AiInsightsCard({ report }: Props) {
  if (!report || report.status !== 'ready') {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-slate-400">
          Your weekly AI insights will appear here after your first full week of check-ins.
        </CardContent>
      </Card>
    );
  }

  const c = report.content as Record<string, unknown>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Weekly Insights — {report.period_key}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        {!!c.trend_narrative && <p>{String(c.trend_narrative)}</p>}
        {!!c.top_insight && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-800 mb-1">Top Insight</p>
            <p>{String(c.top_insight)}</p>
          </div>
        )}
        {!!c.next_week_focus && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="font-medium text-green-800 mb-1">Next Week Focus</p>
            <p>{String(c.next_week_focus)}</p>
          </div>
        )}
        {report.adjustments && !report.adjustment_accepted_at && (
          <PlanAdjustmentBanner reportId={report.id} adjustments={report.adjustments} />
        )}
      </CardContent>
    </Card>
  );
}

function PlanAdjustmentBanner({
  reportId,
  adjustments,
}: {
  reportId: string;
  adjustments: Record<string, unknown>;
}) {
  async function accept() {
    try {
      const token = (await import('@/lib/auth')).getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
      await fetch(`${apiBase}/api/v1/reports/accept-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ report_id: reportId }),
      });
    } catch {
      // silently fail — user can try again
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
      <p className="font-medium text-amber-800 text-xs mb-1">🔧 Your coach recommends a change</p>
      <p className="text-xs text-amber-700 mb-2">
        {String((adjustments as Record<string, unknown>).reason ?? 'See details in your report.')}
      </p>
      <button
        onClick={accept}
        className="text-xs font-medium text-amber-900 underline hover:no-underline"
      >
        Accept adjustment
      </button>
    </div>
  );
}
