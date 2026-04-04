'use client';

import { useEffect, useState } from 'react';

import { PlanView } from '../components/plan';
import { fetchTodayPlan, getLatestPlan, type PlanSnapshot } from '@/lib/api-client';

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

  return <PlanView plan={plan} />;
}
