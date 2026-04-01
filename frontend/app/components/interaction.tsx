'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
import { hasAiKeys } from '../../lib/ai-keys';
import { InputBox } from './input-box';

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
    <main className="min-h-screen bg-slate-50 pb-20 lg:pb-0 lg:pl-64">
      <div className="mx-auto px-4 py-8 max-w-3xl">
        {/* Refresh banner */}
        {planRefreshNeeded ? (
          <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <strong>Your adherence patterns have changed.</strong> Your consistency level is now{' '}
            <em>{consistencyLevel}</em>. Submit a new request below to get an updated plan.
          </div>
        ) : null}

        {/* No keys banner */}
        {!aiKeysConfigured ? (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>AI not configured.</strong> You are using built-in rules which ignore your
            prompt. To get personalised responses, add your API keys on the{' '}
            <Link href="/settings" className="underline font-medium">
              AI settings page
            </Link>.
          </div>
        ) : null}

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Interaction
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Ask for an updated plan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit a question or request to the orchestrator. The latest plan is kept for this session.
          </p>
          {consistencyLevel ? (
            <p className="text-xs text-slate-500 mt-2">
              Adherence level: <strong className="text-slate-700">{consistencyLevel}</strong>
            </p>
          ) : null}
        </div>

        {/* Input card */}
        <Card className="mb-6">
          <CardContent className="pt-5">
            <InputBox onSubmit={handleSubmit} isSubmitting={isSubmitting} />
            {error ? (
              <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
            ) : null}
          </CardContent>
        </Card>

        {/* History card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Session responses</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <article
                    key={`${item.created_at}-${item.prompt}`}
                    className="rounded-xl bg-slate-50 border border-slate-100 p-4"
                  >
                    <p className="text-sm font-semibold text-blue-700 mb-2">{item.prompt}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {item.reply}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No interaction history in this session yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
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
