'use client';

import { useEffect, useState } from 'react';

import { DashboardView } from '../components/dashboard';
import {
  fetchHealthMetrics,
  fetchLabs,
  fetchProfile,
  getLatestPlan,
  type HealthMetricResponse,
  type LabRecordResponse,
  type PlanSnapshot,
  type ProfileResponse
} from '../../lib/api-client';

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [metrics, setMetrics] = useState<HealthMetricResponse[]>([]);
  const [labs, setLabs] = useState<LabRecordResponse[]>([]);
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
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

        if (!isMounted) {
          return;
        }

        setProfile(nextProfile);
        setMetrics(nextMetrics);
        setLabs(nextLabs);
        setPlan(getLatestPlan());
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.');
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

  return <DashboardView profile={profile} metrics={metrics} labs={labs} plan={plan} />;
}

function ErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '520px', backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px' }}>
        <h1 style={{ marginTop: 0 }}>Dashboard unavailable</h1>
        <p>{message}</p>
      </div>
    </main>
  );
}
