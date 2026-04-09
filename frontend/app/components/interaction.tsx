'use client';

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
} from '@/lib/api-client';
import { InputBox } from './input-box';
import type { MealEntry } from '@/app/api/meal-plan/route';

export function InteractionView() {
  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [latestPlan, setLatestPlan] = useState<PlanSnapshot | null>(null);
  const [consistencyLevel, setConsistencyLevel] = useState<string | null>(null);
  const [adaptiveAdjustment, setAdaptiveAdjustment] = useState<AdaptiveAdjustment | null>(null);
  const [planRefreshNeeded, setPlanRefreshNeeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      const enhancedPrompt = intent === 'meal_plan' ? buildMealPlanPrompt(prompt) : prompt;
      const uniqueSignals = deduplicateSignals(latestPlan?.adherence_signals ?? []);

      const response = await submitOrchestratorRequest({
        prompt: enhancedPrompt,
        intent,
        profile,
        metrics,
        labs,
        adherenceSignals: uniqueSignals,
        consistencyLevel,
        adaptiveAdjustment
      });

      await applyResponse(prompt, response, intent, profile);
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

  async function applyResponse(
    prompt: string,
    response: OrchestratorResponse,
    intent: OrchestratorIntent,
    profile: Awaited<ReturnType<typeof fetchProfile>>,
  ) {
    let finalPlan = response.metadata.final_plan ?? null;

    // For meal plan requests, override meals with a proper 7-day AI-generated plan
    if (intent === 'meal_plan') {
      const sevenDayMeals = await fetchSevenDayMeals(prompt, profile);
      if (sevenDayMeals.length > 0) {
        finalPlan = {
          ...(finalPlan ?? {
            intent: 'meal_plan',
            meals: [],
            activity: [],
            behavioral_actions: [],
            lab_insights: [],
            risks: [],
            recommendations: [],
            adherence_signals: [],
            constraints_applied: [],
            biomarker_adjustments: [],
          }),
          meals: sevenDayMeals,
        } as PlanSnapshot;
      }
    }

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

  async function fetchSevenDayMeals(
    userPrompt: string,
    profile: Awaited<ReturnType<typeof fetchProfile>>,
  ): Promise<MealEntry[]> {
    const profileSummary = profile
      ? [
          profile.name ? `Name: ${profile.name}` : '',
          profile.age ? `Age: ${profile.age}` : '',
          profile.gender ? `Gender: ${profile.gender}` : '',
          profile.weight_kg ? `Weight: ${profile.weight_kg} kg` : '',
          profile.goal_target_weight_kg ? `Goal weight: ${profile.goal_target_weight_kg} kg` : '',
          profile.health_conditions ? `Health conditions: ${profile.health_conditions}` : '',
          profile.diet_pattern ? `Diet pattern/preferences: ${profile.diet_pattern}` : '',
          profile.activity_level ? `Activity level: ${profile.activity_level}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : 'No profile available';

    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt, profileSummary }),
      });

      if (!res.ok) return [];

      const data = await res.json() as { meals?: MealEntry[] };
      return data.meals ?? [];
    } catch {
      return [];
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64">
      <div className="mx-auto px-4 py-8 max-w-3xl">
        {/* Refresh banner */}
        {planRefreshNeeded ? (
          <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <strong>Your adherence patterns have changed.</strong> Your consistency level is now{' '}
            <em>{consistencyLevel}</em>. Submit a new request below to get an updated plan.
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
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
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
  if (
    normalized.includes('meal') ||
    normalized.includes('diet') ||
    normalized.includes('food') ||
    normalized.includes('plan')
  ) {
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

/**
 * Appends 7-day meal plan instructions to any meal-plan prompt.
 * The orchestrator receives the user's original request PLUS structured
 * instructions so the AI returns a full week of meals in the meals array.
 */
function buildMealPlanPrompt(userPrompt: string): string {
  return (
    userPrompt +
    '\n\n' +
    'IMPORTANT — structure the response as a complete 7-day meal plan:\n' +
    '• Include 5 meals per day: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner.\n' +
    '• Return all 35 meal entries in the meals array (7 days × 5 meals).\n' +
    '• Start each new day with Breakfast so the days can be correctly separated.\n' +
    '• Vary the meals across all 7 days — no repeated dishes.\n' +
    '• Personalise every meal to the user\'s dietary preferences, health conditions, cultural background, and weight-loss goals.'
  );
}
