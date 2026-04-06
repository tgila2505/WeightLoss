'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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

import {
  type OnboardingPayload,
  upsertProfile
} from '@/lib/api-client';
import { setAiKeys } from '@/lib/ai-keys';

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

export function OnboardingForm() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [groqKey, setGroqKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showMistralKey, setShowMistralKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setForm((current) => ({ ...current, [key]: value }));
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
      setSuccess('Onboarding saved. Redirecting…');
      setTimeout(() => router.push('/dashboard'), 800);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Failed to save onboarding data.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
              <Label htmlFor="name">
                Full name <span className="text-red-500">*</span>
              </Label>
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
                <Label htmlFor="age">
                  Age <span className="text-red-500">*</span>
                </Label>
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
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height_cm">
                  Height (cm) <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="weight_kg">
                  Current weight (kg) <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="goal_target_weight_kg">
                  Target weight (kg) <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="goal_timeline_weeks">
                  Timeline (weeks) <span className="text-red-500">*</span>
                </Label>
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
              <Label htmlFor="health_conditions">Health conditions</Label>
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
              <Label htmlFor="activity_level">
                Activity level <span className="text-red-500">*</span>
              </Label>
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
                <Label htmlFor="sleep_hours">
                  Average sleep (hours) <span className="text-red-500">*</span>
                </Label>
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
                <Label htmlFor="diet_pattern">
                  Diet pattern <span className="text-red-500">*</span>
                </Label>
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
                  {showGroqKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">Mistral</p>
                <Badge variant="secondary" className="text-xs">
                  Fallback
                </Badge>
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
            onClick={() => setStepIndex((s) => Math.max(s - 1, 0))}
            disabled={stepIndex === 0 || isSubmitting}
          >
            Back
          </Button>

          {stepIndex < steps.length - 1 ? (
            <Button
              onClick={() => setStepIndex((s) => s + 1)}
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
  );
}
