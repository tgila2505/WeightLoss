'use client';

import { useEffect, useState } from 'react';

import { PlanView } from '../components/plan';
import { fetchTodayPlan, getLatestPlan, type PlanSnapshot } from '../../lib/api-client';

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      try {
        const nextPlan = await fetchTodayPlan();
        if (!isMounted) {
          return;
        }
        setPlan(nextPlan ?? getLatestPlan());
      } catch {
        if (!isMounted) {
          return;
        }
        setPlan(getLatestPlan());
      }
    }

    loadPlan();
    return () => {
      isMounted = false;
    };
  }, []);

  return <PlanView plan={plan} />;
}
