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
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Tracking unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
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
