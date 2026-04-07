'use client';

import { useEffect, useState } from 'react';
import { fetchProgressSummary, fetchWeeklyReport, type ProgressSummary, type WeeklyReport } from '@/lib/api-client';
import { PageShell } from '../components/page-shell';
import { WeightChart } from './components/weight-chart';
import { ProgressStatsGrid } from './components/progress-stats-grid';
import { AiInsightsCard } from './components/ai-insights-card';

export default function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [nextSummary, nextReport] = await Promise.all([
          fetchProgressSummary(90),
          fetchWeeklyReport().catch(() => null),
        ]);
        if (!isMounted) return;
        setSummary(nextSummary);
        setReport(nextReport);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load progress data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <PageShell>
      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Progress</p>
        <h1 className="text-2xl font-bold text-slate-900">Your Journey</h1>
        <p className="text-sm text-slate-500 mt-1">Weight trend, goal progress, and weekly insights.</p>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : loading ? (
        <div className="space-y-4">
          <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {summary && <WeightChart summary={summary} />}
          {summary && <ProgressStatsGrid summary={summary} />}
          <AiInsightsCard report={report} />
        </div>
      )}
    </PageShell>
  );
}
