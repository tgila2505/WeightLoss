'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import type { WeeklyReport } from '@/lib/api-client';

type Props = {
  report: WeeklyReport | null;
};

export function ReportNotificationCard({ report }: Props) {
  if (!report || report.status !== 'ready') {
    return null;
  }

  const content = report.content as Record<string, unknown>;

  return (
    <Card className="border-purple-100 bg-purple-50">
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-purple-800">📊 Your weekly report is ready</p>
          <p className="text-xs text-purple-600 mt-0.5">
            {typeof content.adherence_pct === 'number'
              ? `${content.adherence_pct}% adherence · `
              : ''}
            Week {report.period_key}
          </p>
        </div>
        <Link
          href="/progress"
          className="text-xs font-medium text-purple-700 hover:text-purple-900 underline flex-shrink-0"
        >
          Read report →
        </Link>
      </CardContent>
    </Card>
  );
}
