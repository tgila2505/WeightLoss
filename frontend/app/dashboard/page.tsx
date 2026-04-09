'use client';

import { useEffect, useState } from 'react';

import { DashboardView } from '../components/dashboard';
import {
  fetchTodayPlan,
  fetchHealthMetrics,
  fetchLabs,
  fetchProfile,
  fetchTodayCheckIn,
  fetchGamificationStatus,
  fetchProgressSummary,
  fetchWeeklyReport,
  getLatestPlan,
  type HealthMetricResponse,
  type LabRecordResponse,
  type PlanSnapshot,
  type ProfileResponse,
  type CheckInTodayResponse,
  type GamificationStatus,
  type ProgressSummary,
  type WeeklyReport,
} from '@/lib/api-client';
import { PageShell } from '../components/page-shell';
import { CheckInCard } from './components/checkin-card';
import { GoalDeltaCard } from './components/goal-delta-card';
import { ReportNotificationCard } from './components/report-notification-card';

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [metrics, setMetrics] = useState<HealthMetricResponse[]>([]);
  const [labs, setLabs] = useState<LabRecordResponse[]>([]);
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  const [planGated, setPlanGated] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckInTodayResponse | null>(null);
  const [gamification, setGamification] = useState<GamificationStatus | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [nextProfile, nextMetrics, nextLabs, nextCheckIn, nextGamification, nextProgress, nextReport] =
          await Promise.all([
            fetchProfile(),
            fetchHealthMetrics(),
            fetchLabs(),
            fetchTodayCheckIn().catch(() => null),
            fetchGamificationStatus().catch(() => null),
            fetchProgressSummary().catch(() => null),
            fetchWeeklyReport().catch(() => null),
          ]);

        if (!isMounted) return;
        setProfile(nextProfile);
        setMetrics(nextMetrics);
        setLabs(nextLabs);
        setTodayCheckIn(nextCheckIn);
        setGamification(nextGamification);
        setProgressSummary(nextProgress);
        setWeeklyReport(nextReport);
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

  const currentStreak = gamification?.streak.current ?? 0;
  const showCheckIn = todayCheckIn !== null && !todayCheckIn.submitted;

  return (
    <PageShell>
    <div className="space-y-4">
      {/* Phase 13: Daily check-in (shown first if not yet submitted) */}
      {showCheckIn && (
        <CheckInCard
          currentStreak={currentStreak}
          onSubmitted={(newStreak) => {
            setGamification(prev =>
              prev ? { ...prev, streak: { ...prev.streak, current: newStreak } } : prev
            );
            setTodayCheckIn({ submitted: true });
          }}
        />
      )}

      {/* Phase 13: Weekly report notification */}
      <ReportNotificationCard report={weeklyReport} />

      {/* Phase 13: Goal progress */}
      <GoalDeltaCard summary={progressSummary} />

      {/* Existing dashboard */}
      <DashboardView profile={profile} metrics={metrics} labs={labs} plan={plan} planGated={planGated} />
    </div>
    </PageShell>
  );
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
