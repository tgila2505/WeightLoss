'use client';

import { useEffect, useState } from 'react';

import { PlanView } from '../components/plan';
import { fetchTodayPlan, getLatestPlan, type PlanSnapshot } from '@/lib/api-client';
import { ShareButton } from '@/components/viral/ShareButton';

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      // Session plan (from current interaction) takes priority
      const sessionPlan = getLatestPlan();
      if (sessionPlan) {
        if (isMounted) setPlan(sessionPlan);
        return;
      }
      // Fall back to backend-persisted plan
      try {
        const backendPlan = await fetchTodayPlan();
        if (isMounted) setPlan(backendPlan);
      } catch {
        if (isMounted) setPlan(null);
      }
    }

    loadPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <PlanView plan={plan} />
      {plan && (
        <div className="flex justify-center pb-8">
          <ShareButton planData={plan as unknown as Record<string, unknown>} />
        </div>
      )}
    </div>
  );
}
