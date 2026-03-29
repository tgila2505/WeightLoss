'use client';

import { useEffect, useState } from 'react';

import { TrackingView } from '../components/tracking';
import {
  fetchAdherenceRecords,
  fetchHealthMetrics,
  fetchLabs,
  type AdherenceRecordResponse,
  type HealthMetricResponse,
  type LabRecordResponse
} from '../../lib/api-client';

export default function TrackingPage() {
  const [metrics, setMetrics] = useState<HealthMetricResponse[]>([]);
  const [labs, setLabs] = useState<LabRecordResponse[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<AdherenceRecordResponse[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [nextMetrics, nextLabs, nextAdherenceRecords] = await Promise.all([
          fetchHealthMetrics(),
          fetchLabs(),
          fetchAdherenceRecords()
        ]);
        if (!isMounted) {
          return;
        }

        setMetrics(nextMetrics);
        setLabs(nextLabs);
        setAdherenceRecords(nextAdherenceRecords);
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

  return (
    <TrackingView
      metrics={metrics}
      labs={labs}
      adherenceRecords={adherenceRecords}
    />
  );
}
