'use client';

import { useEffect, useState } from 'react';

import { fetchFunnelStats } from '@/lib/funnel-session';

export function PlanCounter() {
  const [count, setCount] = useState(14280);

  useEffect(() => {
    fetchFunnelStats()
      .then((stats) => setCount(stats.plans_generated))
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="font-bold text-slate-900">{count.toLocaleString()}</span>
      <span>plans generated</span>
    </div>
  );
}
