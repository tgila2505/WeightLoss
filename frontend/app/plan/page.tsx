'use client';

import { useEffect, useState } from 'react';

import { PlanView } from '../components/plan';
import { getLatestPlan, type PlanSnapshot } from '../../lib/api-client';

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);

  useEffect(() => {
    setPlan(getLatestPlan());
  }, []);

  return <PlanView plan={plan} />;
}
