'use client';

import { useEffect, useState } from 'react';

import { TrackingView } from '../components/tracking';
import {
  fetchHealthMetrics,
  fetchLabs,
  getLatestPlan,
  type HealthMetricResponse,
  type LabRecordResponse,
  type PlanSnapshot
} from '../../lib/api-client';

export default function TrackingPage() {
  const [metrics, setMetrics] = useState<HealthMetricResponse[]>([]);
  const [labs, setLabs] = useState<LabRecordResponse[]>([]);
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [nextMetrics, nextLabs] = await Promise.all([
          fetchHealthMetrics(),
          fetchLabs()
        ]);
        if (!isMounted) {
          return;
        }

        setMetrics(nextMetrics);
        setLabs(nextLabs);
        setPlan(getLatestPlan());
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load tracking.');
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px' }}>
          <h1 style={{ marginTop: 0 }}>Tracking unavailable</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return <TrackingView metrics={metrics} labs={labs} plan={plan} />;
}
