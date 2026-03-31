'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  appendInteractionHistory,
  fetchAdherenceSummary,
  fetchTodayPlan,
  fetchHealthMetrics,
  fetchLabs,
  fetchProfile,
  getInteractionHistory,
  getLatestPlan,
  persistLatestPlan,
  saveLatestPlan,
  submitOrchestratorRequest,
  type AdaptiveAdjustment,
  type InteractionHistoryItem,
  type OrchestratorIntent,
  type OrchestratorResponse,
  type PlanSnapshot
} from '../../lib/api-client';
import { InputBox } from './input-box';
import { NavBar } from './nav-bar';
import { hasAiKeys } from '../../lib/ai-keys';

export function InteractionView() {
  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [latestPlan, setLatestPlan] = useState<PlanSnapshot | null>(null);
  const [consistencyLevel, setConsistencyLevel] = useState<string | null>(null);
  const [adaptiveAdjustment, setAdaptiveAdjustment] = useState<AdaptiveAdjustment | null>(null);
  const [planRefreshNeeded, setPlanRefreshNeeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aiKeysConfigured, setAiKeysConfigured] = useState(false);

  useEffect(() => {
    setAiKeysConfigured(hasAiKeys());
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialState() {
      setHistory(getInteractionHistory());

      const [planResult, summaryResult] = await Promise.allSettled([
        fetchTodayPlan(),
        fetchAdherenceSummary()
      ]);

      if (!isMounted) {
        return;
      }

      if (planResult.status === 'fulfilled') {
        setLatestPlan(planResult.value ?? getLatestPlan());
      } else {
        setLatestPlan(getLatestPlan());
      }

      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        const summary = summaryResult.value;
        setConsistencyLevel(summary.consistency_level);
        setAdaptiveAdjustment(summary.adjustments);
        setPlanRefreshNeeded(summary.plan_refresh_needed);
      }
    }

    loadInitialState();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(prompt: string) {
    setIsSubmitting(true);
    setError('');
    setPlanRefreshNeeded(false);

    try {
      const [profile, metrics, labs] = await Promise.all([
        fetchProfile(),
        fetchHealthMetrics(),
        fetchLabs()
      ]);

      const intent = inferIntent(prompt);
      const uniqueSignals = deduplicateSignals(latestPlan?.adherence_signals ?? []);

      const response = await submitOrchestratorRequest({
        prompt,
        intent,
        profile,
        metrics,
        labs,
        adherenceSignals: uniqueSignals,
        consistencyLevel,
        adaptiveAdjustment
      });

      await applyResponse(prompt, response);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to reach the assistant.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function applyResponse(prompt: string, response: OrchestratorResponse) {
    const finalPlan = response.metadata.final_plan ?? null;
    if (finalPlan) {
      saveLatestPlan(finalPlan);
      setLatestPlan(finalPlan);
      persistLatestPlan(finalPlan).catch(() => {
        // backend persistence failure is non-fatal; plan is still shown in session
      });
    }

    const item = {
      prompt,
      reply: response.content,
      created_at: new Date().toISOString()
    };
    appendInteractionHistory(item);
    setHistory(getInteractionHistory());
  }

  return (
    <main style={pageStyle}>
      {planRefreshNeeded ? (
        <div style={refreshBannerStyle}>
          <strong>Your adherence patterns have changed.</strong> Your consistency level is now{' '}
          <em>{consistencyLevel}</em>. Submit a new request below to get an updated plan.
        </div>
      ) : null}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={eyebrowStyle}>Interaction</p>
        <NavBar current="Interaction" />
      </header>

      {!aiKeysConfigured ? (
        <div style={noKeysBannerStyle}>
          <strong>AI not configured.</strong> You are using built-in rules which ignore your
          prompt. To get personalised responses, add your API keys on the{' '}
          <Link href="/settings" style={{ color: '#92400e' }}>AI settings page</Link>.
        </div>
      ) : null}

      <section style={cardStyle}>
        <p style={eyebrowStyle}>Interaction</p>
        <h1 style={{ margin: '4px 0 8px' }}>Ask for an updated plan</h1>
        <p style={mutedStyle}>
          Submit a question or request to the orchestrator. The latest plan is kept for this session.
        </p>
        {consistencyLevel ? (
          <p style={consistencyBadgeStyle}>
            Adherence level: <strong>{consistencyLevel}</strong>
          </p>
        ) : null}
        <div style={{ marginTop: '20px' }}>
          <InputBox onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
        {error ? <p style={{ color: '#b91c1c', marginTop: '14px' }}>{error}</p> : null}
      </section>

      <section style={{ ...cardStyle, marginTop: '20px' }}>
        <h2 style={{ marginTop: 0 }}>Session responses</h2>
        {history.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {history.map((item) => (
              <article key={`${item.created_at}-${item.prompt}`} style={entryStyle}>
                <p style={{ margin: '0 0 6px', color: '#1d4ed8', fontWeight: 600 }}>{item.prompt}</p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.reply}</p>
              </article>
            ))}
          </div>
        ) : (
          <p style={mutedStyle}>No interaction history in this session yet.</p>
        )}
      </section>
    </main>
  );
}

function deduplicateSignals(
  signals: Array<{ name: string; completed: boolean; score?: number | null }>
): Array<{ name: string; completed: boolean; score?: number | null }> {
  return Array.from(new Map(signals.map((s) => [s.name, s])).values());
}

function inferIntent(prompt: string): OrchestratorIntent {
  const normalized = prompt.toLowerCase();
  if (normalized.includes('meal') || normalized.includes('plan')) {
    return 'meal_plan';
  }
  if (normalized.includes('trend') || normalized.includes('track')) {
    return 'tracking';
  }
  if (normalized.includes('today') || normalized.includes('overview')) {
    return 'dashboard';
  }
  return 'question';
}

const pageStyle = {
  minHeight: '100vh',
  padding: '32px 16px',
  maxWidth: '960px',
  margin: '0 auto'
} as const;

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '24px',
  boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)'
} as const;

const eyebrowStyle = {
  margin: 0,
  color: '#2563eb',
  fontWeight: 600,
  fontSize: '14px'
} as const;

const mutedStyle = {
  margin: 0,
  color: '#64748b'
} as const;

const entryStyle = {
  borderRadius: '14px',
  backgroundColor: '#f8fafc',
  padding: '14px'
} as const;

const noKeysBannerStyle = {
  marginBottom: '16px',
  padding: '14px 18px',
  borderRadius: '12px',
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  color: '#92400e',
  fontSize: '14px'
} as const;

const refreshBannerStyle = {
  marginBottom: '16px',
  padding: '14px 18px',
  borderRadius: '12px',
  backgroundColor: '#fef9c3',
  border: '1px solid #fde047',
  color: '#713f12',
  fontSize: '14px'
} as const;

const consistencyBadgeStyle = {
  margin: '12px 0 0',
  fontSize: '13px',
  color: '#475569'
} as const;
