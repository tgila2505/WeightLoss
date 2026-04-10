import Link from 'next/link';
import { Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';

const LOCKED_ITEMS = [
  '7-day meal plan',
  'Weekly workout schedule',
  'AI coaching insights'
];

export function LockedPlanPreview() {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Pro features
      </p>
      <div className="space-y-3">
        {LOCKED_ITEMS.map((item) => (
          <div key={item} className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <Lock className="h-4 w-4" />
            </div>
            <div className="flex-1 select-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 blur-[1px]">
              {item}
            </div>
          </div>
        ))}
      </div>
      <Button asChild className="mt-2 w-full">
        <Link href="/funnel/upgrade">Unlock your full plan</Link>
      </Button>
      <p className="text-center text-xs text-slate-600">
        7-day free trial for the full plan, then $9/month. Cancel anytime.
      </p>
    </div>
  );
}
