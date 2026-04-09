'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProgressSummary } from '@/lib/api-client';

type Range = '7D' | '30D' | '90D' | 'All';

const RANGES: Range[] = ['7D', '30D', '90D', 'All'];

function daysForRange(range: Range): number {
  if (range === '7D') return 7;
  if (range === '30D') return 30;
  if (range === '90D') return 90;
  return 99999;
}

type Props = {
  summary: ProgressSummary;
};

export function WeightChart({ summary }: Props) {
  const [range, setRange] = useState<Range>('30D');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysForRange(range));

  const data = summary.chart_data
    .filter(p => new Date(p.date) >= cutoff)
    .map(p => ({
      date: p.date,
      weight: p.weight_kg,
      avg: p.rolling_avg,
    }));

  if (data.length < 3) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          Log your weight in your daily check-in to see your trend. You need at least 3 entries.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Weight Trend</CardTitle>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-0.5 text-xs rounded font-medium ${
                  range === r
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={d => d.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={['auto', 'auto']}
              width={36}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number) => [`${value} kg`]}
              labelFormatter={l => `Date: ${l}`}
            />
            {summary.goal_weight_kg !== null && (
              <ReferenceLine
                y={summary.goal_weight_kg}
                stroke="#3b82f6"
                strokeDasharray="4 4"
                label={{ value: 'Goal', fill: '#3b82f6', fontSize: 11 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#94a3b8"
              dot={{ r: 3 }}
              strokeWidth={1.5}
              name="Weight"
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
              name="7-day avg"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
