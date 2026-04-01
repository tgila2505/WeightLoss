'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  AdherenceRecordResponse,
  HealthMetricResponse,
  LabRecordResponse
} from '../../lib/api-client';
import { PageShell } from './page-shell';

export function TrackingView({
  metrics,
  labs,
  adherenceRecords
}: Readonly<{
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  adherenceRecords: AdherenceRecordResponse[];
}>) {
  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Tracking
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Progress and history</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review weight trends, biomarker history, and adherence signals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight trend */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              Body
            </p>
            <CardTitle className="text-base mt-0.5">Weight trend</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.length > 0 ? (
              <ul className="space-y-2">
                {metrics.map((metric) => (
                  <li
                    key={metric.id}
                    className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm text-slate-500">
                      {formatDateTime(metric.recorded_at)}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {metric.weight_kg} kg
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No weight entries yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Biomarker history */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              Labs
            </p>
            <CardTitle className="text-base mt-0.5">Biomarker history</CardTitle>
          </CardHeader>
          <CardContent>
            {labs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Test</th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labs.map((lab) => (
                      <tr key={lab.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 text-slate-500">{lab.recorded_date}</td>
                        <td className="py-2 text-slate-700">{lab.test_name}</td>
                        <td className="py-2 text-slate-700">
                          {lab.value} {lab.unit ?? ''}
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={lab.evaluation.is_abnormal ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {lab.evaluation.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No lab history yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Habit tracking */}
        <Card>
          <CardHeader className="pb-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              Habits
            </p>
            <CardTitle className="text-base mt-0.5">Habit tracking</CardTitle>
          </CardHeader>
          <CardContent>
            {adherenceRecords.length > 0 ? (
              <div className="space-y-2">
                {adherenceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50"
                  >
                    <span className="text-sm text-slate-700 truncate">{record.item_name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">
                        {formatDate(record.adherence_date)}
                      </span>
                      <Badge
                        variant={record.completed ? 'secondary' : 'outline'}
                        className={`text-xs ${record.completed ? 'bg-emerald-100 text-emerald-700 border-0' : ''}`}
                      >
                        {record.completed ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No adherence signals available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}
