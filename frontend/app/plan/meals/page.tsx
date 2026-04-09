'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageShell } from '@/app/components/page-shell';
import {
  fetchTodayPlan,
  fetchProfile,
  fetchHealthMetrics,
  fetchLabs,
  fetchAdherenceSummary,
  getLatestPlan,
  saveLatestPlan,
  persistLatestPlan,
  submitOrchestratorRequest,
  type PlanSnapshot,
} from '@/lib/api-client';
import type { MealEntry } from '@/app/api/meal-plan/route';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekLabels(): string[] {
  const today = new Date().getDay();
  return Array.from({ length: 7 }, (_, i) => WEEKDAYS[(today + i) % 7]);
}

/**
 * Groups a flat meals array into days.
 * A new day starts when we encounter a meal type that has already appeared in the current day
 * AND the current day already has at least 2 different meal types (to avoid splitting on
 * duplicate snacks within the same day — we treat breakfast as the definitive day boundary).
 */
function groupIntoWeek(
  meals: PlanSnapshot['meals'],
): Array<Array<{ meal: string; name: string }>> {
  const days: Array<Array<{ meal: string; name: string }>> = [];
  let current: Array<{ meal: string; name: string }> = [];

  for (const meal of meals) {
    const type = meal.meal.toLowerCase().trim();
    // Treat "breakfast" as the hard day boundary
    if (type.includes('breakfast') && current.some((m) => m.meal.toLowerCase().includes('breakfast'))) {
      days.push(current);
      current = [];
    }
    current.push(meal);
  }
  if (current.length > 0) days.push(current);

  // Pad to 7 days
  while (days.length < 7) days.push([]);
  return days;
}

export default function MealsPage() {
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const session = getLatestPlan();
    if (session) { setPlan(session); return; }

    fetchTodayPlan()
      .then((p) => { if (isMounted) setPlan(p); })
      .catch(() => { if (isMounted) setPlan(null); });

    return () => { isMounted = false; };
  }, []);

  async function handleGenerate(customPrompt?: string) {
    setIsGenerating(true);
    setGenerateError('');

    try {
      const profile = await fetchProfile();
      const dietLabel = profile?.diet_pattern?.trim() ?? '';
      const profileSummary = profile
        ? [
            profile.name ? `Name: ${profile.name}` : '',
            profile.age ? `Age: ${profile.age}` : '',
            profile.gender ? `Gender: ${profile.gender}` : '',
            profile.weight_kg ? `Current weight: ${profile.weight_kg} kg` : '',
            profile.goal_target_weight_kg ? `Goal weight: ${profile.goal_target_weight_kg} kg` : '',
            profile.health_conditions ? `Health conditions: ${profile.health_conditions}` : '',
            dietLabel ? `Diet pattern / cultural preference: ${dietLabel}` : '',
            profile.activity_level ? `Activity level: ${profile.activity_level}` : '',
          ].filter(Boolean).join('\n')
        : '';

      // Make cultural/dietary preferences explicit in the prompt
      let userPrompt: string;
      if (customPrompt) {
        userPrompt = customPrompt;
      } else if (dietLabel) {
        userPrompt = `Generate a complete 7-day ${dietLabel} meal plan personalised to my profile, cultural background, and weight-loss goals.`;
      } else {
        userPrompt = 'Generate a complete 7-day personalised meal plan based on my profile and weight-loss goals.';
      }

      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt, profileSummary }),
      });

      const data = await res.json() as { meals?: MealEntry[]; error?: string };

      if (!res.ok || !data.meals?.length) {
        setGenerateError(data.error ?? 'Failed to generate meal plan. Please try again.');
        return;
      }

      // Estimate average daily calories from generated meals to inform orchestrator
      const avgDailyCalories = computeAvgDailyCalories(data.meals);

      const basePlan: PlanSnapshot = plan ?? {
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
      } as PlanSnapshot;

      let updatedPlan: PlanSnapshot = { ...basePlan, meals: data.meals };

      // Align activity plan with the meal calorie load via orchestrator
      if (avgDailyCalories > 0) {
        try {
          const [metricsResult, labsResult, summaryResult] = await Promise.allSettled([
            fetchHealthMetrics(),
            fetchLabs(),
            fetchAdherenceSummary(),
          ]);

          const goalWeight = profile?.goal_target_weight_kg;
          const activityPrompt =
            `My new 7-day ${dietLabel || ''} meal plan averages approximately ${avgDailyCalories} calories per day. ` +
            (goalWeight ? `My goal is to reach ${goalWeight} kg. ` : '') +
            `Please update my activity plan to create the right caloric deficit and ensure my exercise routine supports this weight-loss goal.`;

          const orchestratorResponse = await submitOrchestratorRequest({
            prompt: activityPrompt,
            intent: 'question',
            profile,
            metrics: metricsResult.status === 'fulfilled' ? metricsResult.value : [],
            labs: labsResult.status === 'fulfilled' ? labsResult.value : [],
            adherenceSignals: updatedPlan.adherence_signals ?? [],
            consistencyLevel: summaryResult.status === 'fulfilled' ? (summaryResult.value?.consistency_level ?? null) : null,
            adaptiveAdjustment: summaryResult.status === 'fulfilled' ? (summaryResult.value?.adjustments ?? null) : null,
          });

          const orchestratorPlan = orchestratorResponse.metadata?.final_plan;
          if (orchestratorPlan) {
            // Keep AI-generated meals; take activity/behavior updates from orchestrator
            updatedPlan = { ...orchestratorPlan, meals: data.meals };
          }
        } catch {
          // Orchestrator failure is non-fatal — the meal plan is still saved
        }
      }

      saveLatestPlan(updatedPlan);
      persistLatestPlan(updatedPlan).catch(() => {});
      setPlan(updatedPlan);
      setActiveDay(0);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  /** Parse calorie values from meal name strings and return average daily total (5 meals/day). */
  function computeAvgDailyCalories(meals: MealEntry[]): number {
    let total = 0;
    let count = 0;
    for (const meal of meals) {
      const match = meal.name.match(/(\d{2,4})\s*cal/i);
      if (match) {
        total += parseInt(match[1], 10);
        count++;
      }
    }
    if (count === 0) return 0;
    return Math.round((total / count) * 5); // 5 meals per day
  }

  const weekLabels = getWeekLabels();
  const week = plan ? groupIntoWeek(plan.meals) : Array.from({ length: 7 }, () => []);
  const daysWithMeals = week.filter((d) => d.length > 0).length;
  const dayMeals = week[activeDay] ?? [];

  return (
    <PageShell>
      <Header />

      {/* Banner when plan is missing or incomplete */}
      {daysWithMeals < 7 && (
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {daysWithMeals === 0 ? 'No 7-day meal plan yet' : `Only ${daysWithMeals} day${daysWithMeals > 1 ? 's' : ''} of meals available`}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Generate a personalised 7-day plan, or ask for a specific diet (e.g. "Pakistani") in Chat.
            </p>
            {generateError ? (
              <p className="text-xs text-red-600 mt-1">{generateError}</p>
            ) : null}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate Plan'}
            </Button>
            <Link
              href="/interaction"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Chat →
            </Link>
          </div>
        </div>
      )}

      {/* Regenerate button when full week is loaded */}
      {daysWithMeals >= 7 && (
        <div className="mb-6 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="text-slate-600"
          >
            {isGenerating ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Regenerating…</>
            ) : (
              'Regenerate Plan'
            )}
          </Button>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6">
        {weekLabels.map((day, i) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDay(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeDay === i
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {i === 0 ? 'Today' : day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Meal cards for selected day */}
      {dayMeals.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayMeals.map((meal, idx) => (
            <MealCard key={`${meal.meal}-${idx}`} slot={meal.meal} name={meal.name} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center space-y-3">
          <p className="text-slate-400 text-sm">No meals planned for {weekLabels[activeDay]}.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</>
            ) : (
              'Generate 7-Day Plan'
            )}
          </Button>
        </div>
      )}
    </PageShell>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <div className="mb-1">
        <Link href="/plan" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← Today's breakdown
        </Link>
      </div>
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
        Nutrition
      </p>
      <h1 className="text-2xl font-bold text-slate-900">7-Day Meal Plan</h1>
      <p className="text-sm text-slate-500 mt-2">
        Breakfast, snack, lunch, snack, and dinner — for each day of the week.
      </p>
    </div>
  );
}

function MealCard({ slot, name }: Readonly<{ slot: string; name: string }>) {
  const emoji = getMealEmoji(slot);
  const dashIndex = name.indexOf(' - ');
  const title = dashIndex !== -1 ? name.slice(0, dashIndex) : name;
  const desc = dashIndex !== -1 ? name.slice(dashIndex + 3) : '';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label={slot}>{emoji}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize">
              {slot}
            </p>
            <CardTitle className="text-sm mt-0.5 leading-snug">{title.trim()}</CardTitle>
          </div>
        </div>
      </CardHeader>
      {desc ? (
        <CardContent className="pt-0">
          <p className="text-xs text-slate-500 leading-relaxed">{desc.trim()}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function getMealEmoji(slot: string): string {
  const s = slot.toLowerCase();
  if (s.includes('breakfast')) return '🌅';
  if (s.includes('snack')) return '🍎';
  if (s.includes('lunch')) return '🥗';
  if (s.includes('dinner')) return '🍽️';
  return '🍴';
}
