'use client';

import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  AdherenceRecordResponse,
  HealthMetricResponse,
  LabRecordResponse,
} from '../../lib/api-client';
import { PageShell } from './page-shell';

// ─── Helpers ────────────────────────────────────────────────────────────────

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

/** Group lab records by test name, sort each series by date ascending */
function buildLabSeries(
  labs: LabRecordResponse[],
): Array<{ testName: string; unit: string | null; data: Array<{ date: string; value: number; isAbnormal: boolean }> }> {
  const map = new Map<string, LabRecordResponse[]>();
  for (const r of labs) {
    const name = r.evaluation.normalized_test_name ?? r.test_name;
    const list = map.get(name) ?? [];
    list.push(r);
    map.set(name, list);
  }

  return Array.from(map.entries())
    .filter(([, records]) => records.length >= 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([testName, records]) => {
      const sorted = [...records].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date));
      return {
        testName,
        unit: sorted[sorted.length - 1].processed.normalized_unit ?? sorted[sorted.length - 1].unit ?? null,
        data: sorted.map((r) => ({
          date: shortDate(r.recorded_date),
          value: r.processed.normalized_value,
          isAbnormal: r.evaluation.is_abnormal,
        })),
      };
    });
}

/** Build weight metric series sorted oldest → newest */
function buildWeightSeries(
  metrics: HealthMetricResponse[],
): Array<{ date: string; value: number }> {
  return [...metrics]
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map((m) => ({ date: shortDate(m.recorded_at.slice(0, 10)), value: m.weight_kg }));
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

interface TooltipPayload {
  value: number;
  payload: { isAbnormal?: boolean };
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  unit?: string | null;
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: data } = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
      <p className={data.isAbnormal ? 'text-amber-700 font-bold' : 'text-slate-900'}>
        {value} {unit ?? ''}
        {data.isAbnormal && ' ⚠'}
      </p>
    </div>
  );
}

// ─── Mini trend chart ─────────────────────────────────────────────────────────

function TrendChart({
  data,
  unit,
  color = '#2563eb',
  refLineValue,
}: Readonly<{
  data: Array<{ date: string; value: number; isAbnormal?: boolean }>;
  unit?: string | null;
  color?: string;
  refLineValue?: number;
}>) {
  if (data.length === 0) return <p className="text-xs text-slate-400 py-6 text-center">No data</p>;

  // For single point, duplicate so recharts can render a dot
  const chartData = data.length === 1 ? [data[0], data[0]] : data;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toString()}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        {refLineValue !== undefined && (
          <ReferenceLine y={refLineValue} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrackingView({
  metrics,
  labs,
  adherenceRecords,
}: Readonly<{
  metrics: HealthMetricResponse[];
  labs: LabRecordResponse[];
  adherenceRecords: AdherenceRecordResponse[];
}>) {
  const labSeries = buildLabSeries(labs);
  const weightSeries = buildWeightSeries(metrics);

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Tracking</p>
        <h1 className="text-2xl font-bold text-slate-900">Progress &amp; History</h1>
        <p className="text-sm text-slate-500 mt-2">
          Trend lines for weight, biomarkers, and adherence over time.
        </p>
      </div>

      {/* ── Weight trend ─────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Body</p>
            <h2 className="text-base font-bold text-slate-900">Weight trend</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-sm">Weight (kg)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {metrics.length > 0 ? (
                <TrendChart data={weightSeries} unit="kg" color="#2563eb" />
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No weight entries yet.</p>
              )}
              {metrics.length > 0 && (
                <p className="text-xs text-slate-400 text-right mt-1">
                  Latest: <strong className="text-slate-600">{metrics[metrics.length - 1]?.weight_kg} kg</strong>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Biomarker trends ──────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Labs</p>
            <h2 className="text-base font-bold text-slate-900">Biomarker trends</h2>
          </div>
          <Link
            href="/lab-test"
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Upload results →
          </Link>
        </div>

        {labSeries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <p className="text-sm text-slate-500">No lab results yet.</p>
            <Link href="/lab-test" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              Upload your first lab report →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {labSeries.map(({ testName, unit, data }) => {
              const latest = data[data.length - 1];
              const hasAbnormal = data.some((d) => d.isAbnormal);
              return (
                <Card
                  key={testName}
                  className={hasAbnormal ? 'border-amber-200' : 'border-slate-200'}
                >
                  <CardHeader className="pb-1 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-tight">{testName}</CardTitle>
                      {hasAbnormal && (
                        <Badge
                          variant="outline"
                          className="text-amber-700 border-amber-300 bg-amber-50 text-xs flex-shrink-0"
                        >
                          Review
                        </Badge>
                      )}
                    </div>
                    {unit && <p className="text-xs text-slate-400">{unit}</p>}
                  </CardHeader>
                  <CardContent className="pb-4">
                    <TrendChart
                      data={data}
                      unit={unit}
                      color={hasAbnormal ? '#d97706' : '#2563eb'}
                    />
                    {latest && (
                      <p className="text-xs text-slate-400 text-right mt-1">
                        Latest:{' '}
                        <strong className={hasAbnormal ? 'text-amber-700' : 'text-slate-600'}>
                          {latest.value} {unit ?? ''}
                        </strong>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Habit tracking ────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Habits</p>
          <h2 className="text-base font-bold text-slate-900">Adherence signals</h2>
        </div>

        {adherenceRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <p className="text-sm text-slate-500">No adherence signals yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {adherenceRecords.slice(0, 30).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm"
              >
                <span className="text-sm text-slate-700 truncate">{record.item_name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400">{formatDate(record.adherence_date)}</span>
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
        )}
      </section>
    </PageShell>
  );
}
