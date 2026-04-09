'use client';

import { useEffect, useState } from 'react';

import { DashboardView } from '../components/dashboard';
import {
  fetchTodayPlan,
  fetchHealthMetrics,
  fetchLabs,
  fetchProfile,
  getLatestPlan,
  type HealthMetricResponse,
  type LabRecordResponse,
  type PlanSnapshot,
  type ProfileResponse
} from '@/lib/api-client';

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [metrics, setMetrics] = useState<HealthMetricResponse[]>([]);
  const [labs, setLabs] = useState<LabRecordResponse[]>([]);
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  const [planGated, setPlanGated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [nextProfile, nextMetrics, nextLabs] = await Promise.all([
          fetchProfile(),
          fetchHealthMetrics(),
          fetchLabs()
        ]);

        if (!isMounted) return;
        setProfile(nextProfile);
        setMetrics(nextMetrics);
        setLabs(nextLabs);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
        return;
      }

      // Fetch plan separately — a 402 (feature gate) should not block the whole dashboard
      try {
        const nextPlan = await fetchTodayPlan();
        if (!isMounted) return;
        setPlan(nextPlan ?? getLatestPlan());
      } catch {
        if (!isMounted) return;
        setPlanGated(true);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return <ErrorState message={error} />;
  }

  return <DashboardView profile={profile} metrics={metrics} labs={labs} plan={plan} planGated={planGated} />;
}

function ErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Dashboard unavailable</h1>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </main>
  );
}
