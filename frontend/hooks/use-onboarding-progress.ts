'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOnboardingState, saveOnboardingState } from '@/lib/api-client';

export type OnboardingFormData = Record<string, string>;

interface OnboardingProgress {
  currentStep: number;
  formData: OnboardingFormData;
  completed: boolean;
}

const LOCAL_KEY = 'onboarding_progress';
const DEBOUNCE_MS = 800;

function readLocal(): OnboardingProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProgress) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: OnboardingProgress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
}

function clearLocal() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_KEY);
}

/**
 * Persists onboarding wizard state across browser sessions.
 *
 * Strategy:
 * - Immediately writes to localStorage as fallback.
 * - Debounces backend sync (800 ms) to avoid a round-trip per keystroke.
 * - On mount, tries backend first; falls back to localStorage.
 */
export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 0,
    formData: {},
    completed: false,
  });
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved state on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Try backend first
      try {
        const state = await fetchOnboardingState();
        if (!cancelled && state && !state.completed) {
          setProgress({
            currentStep: state.current_step,
            formData: state.form_data as OnboardingFormData,
            completed: state.completed,
          });
          setLoading(false);
          return;
        }
      } catch {
        // fall through to localStorage
      }

      // Fallback to localStorage
      const local = readLocal();
      if (!cancelled && local && !local.completed) {
        setProgress(local);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback((next: OnboardingProgress) => {
    setProgress(next);
    writeLocal(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveOnboardingState({
        current_step: next.currentStep,
        form_data: next.formData,
        completed: next.completed,
      }).catch(() => {
        // Backend write failure is silent; localStorage is the fallback
      });
    }, DEBOUNCE_MS);
  }, []);

  function markCompleted(formData: OnboardingFormData) {
    const next: OnboardingProgress = { currentStep: 0, formData, completed: true };
    setProgress(next);
    clearLocal();
    // Sync completion immediately (no debounce)
    saveOnboardingState({ current_step: 0, form_data: formData, completed: true }).catch(() => {});
  }

  return { progress, loading, save, markCompleted };
}
