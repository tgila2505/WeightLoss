'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  type OnboardingPayload,
  upsertProfile
} from '../../../lib/api-client';

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
    title: 'Profile',
    description: 'Basic details to create your starting profile.'
  },
  {
    id: 'goals',
    title: 'Goals and conditions',
    description: 'Your target and any important health context.'
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle habits',
    description: 'Daily patterns that shape your plan.'
  }
] as const;

export function OnboardingForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
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

    return (
      form.activity_level.trim() !== '' &&
      form.sleep_hours !== '' &&
      form.diet_pattern.trim() !== ''
    );
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
      setSuccess('Onboarding saved successfully.');
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
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)'
      }}
    >
      <p style={{ margin: 0, color: '#2563eb', fontWeight: 600 }}>
        Step {stepIndex + 1} of {steps.length}
      </p>
      <h1 style={{ marginBottom: '8px' }}>{currentStep.title}</h1>
      <p style={{ marginTop: 0, color: '#4b5563' }}>{currentStep.description}</p>

      <div
        style={{
          display: 'grid',
          gap: '16px',
          marginTop: '24px'
        }}
      >
        {stepIndex === 0 ? (
          <>
            <Field label="Full name" required>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                style={inputStyle}
              />
            </Field>
            <TwoColumnRow>
              <Field label="Age" required>
                <input
                  type="number"
                  min="1"
                  value={form.age}
                  onChange={(event) => updateField('age', event.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Gender">
                <input
                  value={form.gender}
                  onChange={(event) => updateField('gender', event.target.value)}
                  style={inputStyle}
                />
              </Field>
            </TwoColumnRow>
            <TwoColumnRow>
              <Field label="Height (cm)" required>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.height_cm}
                  onChange={(event) => updateField('height_cm', event.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Current weight (kg)" required>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(event) => updateField('weight_kg', event.target.value)}
                  style={inputStyle}
                />
              </Field>
            </TwoColumnRow>
          </>
        ) : null}

        {stepIndex === 1 ? (
          <>
            <TwoColumnRow>
              <Field label="Target weight (kg)" required>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.goal_target_weight_kg}
                  onChange={(event) =>
                    updateField('goal_target_weight_kg', event.target.value)
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="Timeline (weeks)" required>
                <input
                  type="number"
                  min="1"
                  value={form.goal_timeline_weeks}
                  onChange={(event) =>
                    updateField('goal_timeline_weeks', event.target.value)
                  }
                  style={inputStyle}
                />
              </Field>
            </TwoColumnRow>
            <Field label="Health conditions">
              <textarea
                value={form.health_conditions}
                onChange={(event) =>
                  updateField('health_conditions', event.target.value)
                }
                style={{ ...inputStyle, minHeight: '96px', resize: 'vertical' }}
                placeholder="Optional: include any current conditions or concerns."
              />
            </Field>
          </>
        ) : null}

        {stepIndex === 2 ? (
          <>
            <Field label="Activity level" required>
              <select
                value={form.activity_level}
                onChange={(event) => updateField('activity_level', event.target.value)}
                style={inputStyle}
              >
                <option value="">Select activity level</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </Field>
            <TwoColumnRow>
              <Field label="Average sleep (hours)" required>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={form.sleep_hours}
                  onChange={(event) => updateField('sleep_hours', event.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Diet pattern" required>
                <input
                  value={form.diet_pattern}
                  onChange={(event) => updateField('diet_pattern', event.target.value)}
                  style={inputStyle}
                  placeholder="Example: balanced, vegetarian"
                />
              </Field>
            </TwoColumnRow>
          </>
        ) : null}
      </div>

      {error ? (
        <p style={{ marginTop: '20px', color: '#b91c1c' }}>{error}</p>
      ) : null}
      {success ? (
        <p style={{ marginTop: '20px', color: '#15803d' }}>{success}</p>
      ) : null}

      <div
        style={{
          marginTop: '28px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between'
        }}
      >
        <button
          type="button"
          onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
          disabled={stepIndex === 0 || isSubmitting}
          style={secondaryButtonStyle}
        >
          Back
        </button>

        {stepIndex < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex((current) => current + 1)}
            disabled={!canContinue || isSubmitting}
            style={primaryButtonStyle}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canContinue || isSubmitting}
            style={primaryButtonStyle}
          >
            {isSubmitting ? 'Saving...' : 'Save onboarding'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children
}: Readonly<{
  label: string;
  required?: boolean;
  children: ReactNode;
}>) {
  return (
    <label style={{ display: 'grid', gap: '8px' }}>
      <span style={{ fontWeight: 600 }}>
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function TwoColumnRow({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #d1d5db',
  fontSize: '16px',
  boxSizing: 'border-box'
};

const primaryButtonStyle: CSSProperties = {
  padding: '12px 18px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer'
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  backgroundColor: '#e5e7eb',
  color: '#111827'
};
