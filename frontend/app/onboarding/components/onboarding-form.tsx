'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  type OnboardingPayload,
  upsertProfile
} from '../../../lib/api-client';
import { setAiKeys } from '../../../lib/ai-keys';

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
  },
  {
    id: 'ai_setup',
    title: 'AI setup',
    description: 'Connect AI providers to get personalised meal and behavior plans.'
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
    // Step 4 (AI setup) can always continue — keys are optional
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
      setSuccess('Onboarding saved. Redirecting...');
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

      <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>

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
                  placeholder="e.g. balanced, vegetarian, desi"
                />
              </Field>
            </TwoColumnRow>
          </>
        ) : null}

        {stepIndex === 3 ? (
          <>
            <div style={infoBoxStyle}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Why add API keys?</p>
              <p style={{ margin: 0, color: '#4b5563', fontSize: '14px' }}>
                Without keys the app uses built-in rules. With keys, a real LLM generates
                fully personalised plans based on your exact request — like a desi meal plan,
                a Ramadan schedule, or post-workout meals.
              </p>
            </div>

            <div style={providerBlockStyle}>
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
                Groq <span style={badgeStyle}>Primary</span>
              </p>
              <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: '13px' }}>
                1. Go to <strong>console.groq.com</strong> → sign up for free
                <br />
                2. Click <strong>API Keys</strong> → <strong>Create API Key</strong>
                <br />
                3. Copy and paste below
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  style={{ ...inputStyle, paddingRight: '80px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey((v) => !v)}
                  style={showHideStyle}
                >
                  {showGroqKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={providerBlockStyle}>
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
                Mistral <span style={{ ...badgeStyle, backgroundColor: '#f3f4f6', color: '#374151' }}>Fallback</span>
              </p>
              <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: '13px' }}>
                1. Go to <strong>console.mistral.ai</strong> → sign up for free
                <br />
                2. Click <strong>API Keys</strong> → <strong>Create new key</strong>
                <br />
                3. Copy and paste below
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  type={showMistralKey ? 'text' : 'password'}
                  value={mistralKey}
                  onChange={(e) => setMistralKey(e.target.value)}
                  placeholder="..."
                  style={{ ...inputStyle, paddingRight: '80px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowMistralKey((v) => !v)}
                  style={showHideStyle}
                >
                  {showMistralKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              Keys are stored locally in your browser and never sent to our servers.
              You can skip this and add them later from settings.
            </p>
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
          <div style={{ display: 'flex', gap: '10px' }}>
            {(!groqKey.trim() || !mistralKey.trim()) ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={secondaryButtonStyle}
              >
                {isSubmitting ? 'Saving...' : 'Skip and finish'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={primaryButtonStyle}
            >
              {isSubmitting ? 'Saving...' : groqKey.trim() && mistralKey.trim() ? 'Save and finish' : 'Finish'}
            </button>
          </div>
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

const infoBoxStyle: CSSProperties = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '12px',
  padding: '16px'
};

const providerBlockStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px'
};

const badgeStyle: CSSProperties = {
  display: 'inline-block',
  marginLeft: '6px',
  padding: '2px 8px',
  borderRadius: '20px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: '#dbeafe',
  color: '#1d4ed8'
};

const showHideStyle: CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'none',
  color: '#2563eb',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '13px'
};
