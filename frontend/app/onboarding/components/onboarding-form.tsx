'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import { type OnboardingPayload, upsertProfile } from '@/lib/api-client';
import { setAiKeys } from '@/lib/ai-keys';
import { FieldTooltip } from '@/components/guidance/field-tooltip';
import { Walkthrough, type WalkthroughStep } from '@/components/guidance/walkthrough';
import { useOnboardingProgress } from '@/hooks/use-onboarding-progress';
import { useBehaviorTracker } from '@/hooks/use-behavior-tracker';

type FormState = OnboardingPayload;

const initialState: FormState = {
  name: '',
  age: '',
  gender: '',
  height_cm: '',
  weight_kg: '',
  goal_target_weight_kg: '',
  goal_timeline_weeks: '',
  health_conditions: '',
  activity_level: '',
  sleep_hours: '',
  diet_pattern: ''
};

const steps = [
  {
    id: 'profile',
    title: 'Your profile',
    description: 'Basic details to create your starting profile.'
  },
  {
    id: 'goals',
    title: 'Goals & conditions',
    description: 'Your target and any important health context.'
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle habits',
    description: 'Daily patterns that shape your plan.'
  },
  {
    id: 'ai_setup',
    title: 'AI setup',
    description: 'Connect AI providers for personalised plans.'
  }
] as const;

const walkthroughSteps: WalkthroughStep[] = [
  {
    title: 'Welcome to your setup',
    description:
      'This 4-step wizard builds your personalised health profile. Your progress is saved automatically — pick up where you left off any time.',
  },
  {
    title: 'Required fields',
    description:
      'Fields marked with a red asterisk (*) are required to proceed. Others are optional but improve plan quality.',
    targetSelector: '#name',
  },
  {
    title: 'Your data stays private',
    description:
      'Profile data is encrypted in transit and stored only for personalising your AI plan. API keys never leave your browser.',
  },
];

export function OnboardingForm() {
  const router = useRouter();
  const { progress, loading, save, markCompleted } = useOnboardingProgress();
  const { track } = useBehaviorTracker({ context: 'onboarding' });

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore progress once loaded
  useEffect(() => {
    if (loading) return;
    if (progress.currentStep > 0 || Object.keys(progress.formData).length > 0) {
      setStepIndex(progress.currentStep);
      setForm((prev) => ({ ...prev, ...(progress.formData as Partial<FormState>) }));
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps[stepIndex];

  const canContinue = useMemo(() => {
    if (stepIndex === 0) {
      return (
        form.name.trim() !== '' &&
        form.age !== '' &&
        form.height_cm !== '' &&
        form.weight_kg !== ''
      );
    }
    if (stepIndex === 1) {
      return form.goal_target_weight_kg !== '' && form.goal_timeline_weeks !== '';
    }
    if (stepIndex === 2) {
      return (
        form.activity_level.trim() !== '' &&
        form.sleep_hours !== '' &&
        form.diet_pattern.trim() !== ''
      );
    }
    return true;
  }, [form, stepIndex]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      save({ currentStep: stepIndex, formData: next, completed: false });
      return next;
    });
  }

  function goToStep(next: number) {
    if (next > stepIndex) {
      track('drop_off', { from_step: stepIndex, to_step: next, direction: 'forward' });
    }
    setStepIndex(next);
    save({ currentStep: next, formData: form, completed: false });
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await upsertProfile(form);
      if (groqKey.trim() && mistralKey.trim()) {
        setAiKeys(groqKey.trim(), mistralKey.trim());
      }
      markCompleted(form as unknown as Record<string, string>);
      setSuccess('Onboarding saved. Redirecting…');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (submissionError) {
      if (submissionError instanceof Error && submissionError.message === 'FEATURE_GATED') {
        // Profile was saved but advanced features require Pro — navigate forward with a notice.
        markCompleted(form as unknown as Record<string, string>);
        setSuccess('Your profile has been saved. Upgrade to Pro to unlock advanced features.');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Failed to save onboarding data.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <Walkthrough
        steps={walkthroughSteps}
        storageKey="onboarding_walkthrough_done"
      />

      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="pb-4">
          <div className="space-y-2 mb-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Step {stepIndex + 1} of {steps.length} — {currentStep.title}
            </p>
            <Progress value={((stepIndex + 1) / steps.length) * 100} className="h-1.5" />
          </div>
          <CardTitle className="text-xl">{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {stepIndex === 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-0.5">
                  <Label htmlFor="name">
                    Full name <span className="text-red-500">*</span>
                  </Label>
                  <FieldTooltip content="Used to personalise your AI-generated plans and reminders." />
                </div>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Your full name"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="age">
                      Age <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="Age affects your baseline calorie needs and safe weight-loss rate." />
                  </div>
                  <Input
                    id="age"
                    type="number"
                    min="1"
                    value={form.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="e.g. 32"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) => updateField('gender', v)}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="height_cm">
                      Height (cm) <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="Used to calculate your BMI and recommended calorie targets." />
                  </div>
                  <Input
                    id="height_cm"
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.height_cm}
                    onChange={(e) => updateField('height_cm', e.target.value)}
                    placeholder="e.g. 170"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="weight_kg">
                      Current weight (kg) <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="Your starting point. Track changes over time to see your progress." />
                  </div>
                  <Input
                    id="weight_kg"
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.weight_kg}
                    onChange={(e) => updateField('weight_kg', e.target.value)}
                    placeholder="e.g. 80"
                  />
                </div>
              </div>
            </>
          ) : null}

          {stepIndex === 1 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="goal_target_weight_kg">
                      Target weight (kg) <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="Your goal weight. The AI will build a safe, realistic plan to get there." />
                  </div>
                  <Input
                    id="goal_target_weight_kg"
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.goal_target_weight_kg}
                    onChange={(e) => updateField('goal_target_weight_kg', e.target.value)}
                    placeholder="e.g. 70"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="goal_timeline_weeks">
                      Timeline (weeks) <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="A realistic timeline helps set a sustainable weekly deficit. 12–24 weeks is typical." />
                  </div>
                  <Input
                    id="goal_timeline_weeks"
                    type="number"
                    min="1"
                    value={form.goal_timeline_weeks}
                    onChange={(e) => updateField('goal_timeline_weeks', e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-0.5">
                  <Label htmlFor="health_conditions">Health conditions</Label>
                  <FieldTooltip content="E.g. diabetes, hypertension, PCOS. The AI uses this to exclude contraindicated foods and activities." />
                </div>
                <Textarea
                  id="health_conditions"
                  value={form.health_conditions}
                  onChange={(e) => updateField('health_conditions', e.target.value)}
                  placeholder="Optional: include any current conditions or concerns (e.g. diabetes, hypertension)."
                  className="min-h-[96px] resize-y"
                />
                <p className="text-xs text-slate-500">
                  This helps personalise your plan. Leave blank if not applicable.
                </p>
              </div>
            </>
          ) : null}

          {stepIndex === 2 ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-0.5">
                  <Label htmlFor="activity_level">
                    Activity level <span className="text-red-500">*</span>
                  </Label>
                  <FieldTooltip content="Your typical weekly exercise. Affects your total daily energy expenditure (TDEE)." />
                </div>
                <Select
                  value={form.activity_level}
                  onValueChange={(v) => updateField('activity_level', v)}
                >
                  <SelectTrigger id="activity_level">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — mostly sedentary</SelectItem>
                    <SelectItem value="moderate">Moderate — light exercise 2–3×/week</SelectItem>
                    <SelectItem value="high">High — intense exercise 4+×/week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="sleep_hours">
                      Average sleep (hours) <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="Sleep quality directly affects hunger hormones (ghrelin/leptin) and weight loss." />
                  </div>
                  <Input
                    id="sleep_hours"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={form.sleep_hours}
                    onChange={(e) => updateField('sleep_hours', e.target.value)}
                    placeholder="e.g. 7"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <Label htmlFor="diet_pattern">
                      Diet pattern <span className="text-red-500">*</span>
                    </Label>
                    <FieldTooltip content="E.g. balanced, vegetarian, desi, keto. The AI tailors meal suggestions to your preferences." />
                  </div>
                  <Input
                    id="diet_pattern"
                    value={form.diet_pattern}
                    onChange={(e) => updateField('diet_pattern', e.target.value)}
                    placeholder="e.g. balanced, vegetarian, desi"
                  />
                </div>
              </div>
            </>
          ) : null}

          {stepIndex === 3 ? (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-blue-900">Why add API keys?</p>
                <p className="text-sm text-blue-700">
                  Without keys the app uses built-in rules. With keys, a real LLM generates
                  fully personalised plans — like a desi meal plan, a Ramadan schedule, or
                  post-workout meals.
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  These keys are optional. You can skip this and add them later from Settings.
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">Groq</p>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">
                    Primary
                  </Badge>
                  <FieldTooltip
                    content="Groq runs Llama models at very high speed — free tier is generous."
                    side="right"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Go to <strong>console.groq.com</strong> → sign up free → API Keys → Create API Key
                </p>
                <div className="relative">
                  <Input
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showGroqKey ? 'Hide Groq key' : 'Show Groq key'}
                  >
                    {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">Mistral</p>
                  <Badge variant="secondary" className="text-xs">
                    Fallback
                  </Badge>
                  <FieldTooltip
                    content="Mistral is used when Groq is unavailable or rate-limited."
                    side="right"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Go to <strong>console.mistral.ai</strong> → sign up free → API Keys → Create new key
                </p>
                <div className="relative">
                  <Input
                    type={showMistralKey ? 'text' : 'password'}
                    value={mistralKey}
                    onChange={(e) => setMistralKey(e.target.value)}
                    placeholder="Mistral API key…"
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMistralKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showMistralKey ? 'Hide Mistral key' : 'Show Mistral key'}
                  >
                    {showMistralKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Keys are stored only in your browser and never sent to our servers.
              </p>
            </>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          ) : null}
          {success ? (
            <p className="text-sm text-emerald-600">{success}</p>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => goToStep(Math.max(stepIndex - 1, 0))}
              disabled={stepIndex === 0 || isSubmitting}
            >
              Back
            </Button>

            {stepIndex < steps.length - 1 ? (
              <Button
                onClick={() => goToStep(stepIndex + 1)}
                disabled={!canContinue || isSubmitting}
                className="sm:min-w-[140px]"
              >
                Continue
              </Button>
            ) : (
              <div className="flex gap-2">
                {!groqKey.trim() || !mistralKey.trim() ? (
                  <Button
                    variant="outline"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Skip and finish'
                    )}
                  </Button>
                ) : null}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="sm:min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : groqKey.trim() && mistralKey.trim() ? (
                    'Save and finish'
                  ) : (
                    'Finish'
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
