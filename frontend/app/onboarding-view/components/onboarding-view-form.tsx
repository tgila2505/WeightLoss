'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { fetchProfile, patchProfileGender, type ProfileResponse } from '@/lib/api-client';

const steps = [
  {
    id: 'profile',
    title: 'Your profile',
    description: 'Basic details to create your starting profile.',
  },
  {
    id: 'goals',
    title: 'Goals & conditions',
    description: 'Your target and any important health context.',
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle habits',
    description: 'Daily patterns that shape your plan.',
  },
] as const;

function mapProfileToForm(profile: ProfileResponse) {
  return {
    name: profile.name ?? '',
    age: profile.age != null ? String(profile.age) : '',
    gender: profile.gender ?? '',
    height_cm: profile.height_cm != null ? String(profile.height_cm) : '',
    weight_kg: profile.weight_kg != null ? String(profile.weight_kg) : '',
    goal_target_weight_kg:
      profile.goal_target_weight_kg != null
        ? String(profile.goal_target_weight_kg)
        : '',
    goal_timeline_weeks:
      profile.goal_timeline_weeks != null
        ? String(profile.goal_timeline_weeks)
        : '',
    health_conditions: profile.health_conditions ?? '',
    activity_level: profile.activity_level ?? '',
    sleep_hours:
      profile.sleep_hours != null ? String(profile.sleep_hours) : '',
    diet_pattern: profile.diet_pattern ?? '',
  };
}

const emptyForm = {
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
  diet_pattern: '',
};

export function OnboardingViewForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [genderSaving, setGenderSaving] = useState(false);
  const [genderSaved, setGenderSaved] = useState(false);
  const [genderError, setGenderError] = useState('');

  const currentStep = steps[stepIndex];

  async function handleGenderChange(value: string) {
    setForm((f) => ({ ...f, gender: value }));
    setGenderSaving(true);
    setGenderError('');
    try {
      await patchProfileGender(value);
      setGenderSaved(true);
      setTimeout(() => setGenderSaved(false), 2500);
    } catch {
      setGenderError('Failed to save gender. Please try again.');
    } finally {
      setGenderSaving(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchProfile()
      .then((profile) => {
        if (!isMounted) return;
        if (profile) {
          setForm(mapProfileToForm(profile));
        }
      })
      .catch(() => {
        if (isMounted) setError('Unable to load your onboarding data.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="py-16 flex items-center justify-center">
          <p className="text-sm text-slate-500">Loading your profile…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="pb-4">
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              Step {stepIndex + 1} of {steps.length} — {currentStep.title}
            </p>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {stepIndex === 0 ? 'Gender editable' : 'Read only'}
            </span>
          </div>
          <Progress
            value={((stepIndex + 1) / steps.length) * 100}
            className="h-1.5"
          />
        </div>
        <CardTitle className="text-xl">{currentStep.title}</CardTitle>
        <CardDescription>{currentStep.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {stepIndex === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} disabled />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" value={form.age} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender} onValueChange={handleGenderChange} disabled={genderSaving}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                {genderSaving && <p className="text-xs text-slate-400">Saving…</p>}
                {genderSaved && !genderSaving && <p className="text-xs text-emerald-600 font-semibold">Saved.</p>}
                {genderError && <p className="text-xs text-red-500">{genderError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height_cm">Height (cm)</Label>
                <Input id="height_cm" type="number" value={form.height_cm} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Current weight (kg)</Label>
                <Input id="weight_kg" type="number" value={form.weight_kg} disabled />
              </div>
            </div>
          </>
        ) : null}

        {stepIndex === 1 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal_target_weight_kg">Target weight (kg)</Label>
                <Input
                  id="goal_target_weight_kg"
                  type="number"
                  value={form.goal_target_weight_kg}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal_timeline_weeks">Timeline (weeks)</Label>
                <Input
                  id="goal_timeline_weeks"
                  type="number"
                  value={form.goal_timeline_weeks}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_conditions">Health conditions</Label>
              <Textarea
                id="health_conditions"
                value={form.health_conditions}
                disabled
                className="min-h-[96px] resize-none"
              />
            </div>
          </>
        ) : null}

        {stepIndex === 2 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="activity_level">Activity level</Label>
              <Select value={form.activity_level} disabled>
                <SelectTrigger id="activity_level">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — mostly sedentary</SelectItem>
                  <SelectItem value="moderate">
                    Moderate — light exercise 2–3×/week
                  </SelectItem>
                  <SelectItem value="high">
                    High — intense exercise 4+×/week
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sleep_hours">Average sleep (hours)</Label>
                <Input
                  id="sleep_hours"
                  type="number"
                  value={form.sleep_hours}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diet_pattern">Diet pattern</Label>
                <Input id="diet_pattern" value={form.diet_pattern} disabled />
              </div>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => setStepIndex((s) => Math.max(s - 1, 0))}
            disabled={stepIndex === 0}
          >
            Back
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button onClick={() => setStepIndex((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStepIndex(0)}>
              Back to start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
