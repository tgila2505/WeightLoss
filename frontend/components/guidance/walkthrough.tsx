'use client';

import { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface WalkthroughStep {
  title: string;
  description: string;
  /** CSS selector of the element to highlight, e.g. "#name" */
  targetSelector?: string;
}

interface WalkthroughProps {
  steps: WalkthroughStep[];
  storageKey: string;
  onComplete?: () => void;
}

/**
 * Sequential walkthrough overlay.
 * Highlights a DOM element, shows a tip card, and tracks completion in localStorage.
 * Skippable and resumable.
 */
export function Walkthrough({ steps, storageKey, onComplete }: WalkthroughProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Show only if not already completed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem(storageKey);
    if (!done) setVisible(true);
  }, [storageKey]);

  const currentStep = steps[stepIndex];

  // Position the tip card near the target element
  useEffect(() => {
    if (!visible || !currentStep?.targetSelector) {
      setPosition(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setPosition(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosition({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX });
  }, [visible, stepIndex, currentStep?.targetSelector]);

  function dismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(storageKey, '1');
    setVisible(false);
  }

  function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      dismiss();
      onComplete?.();
    }
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (!visible) return null;

  const tipStyle = position
    ? { position: 'absolute' as const, top: position.top, left: position.left }
    : { position: 'fixed' as const, bottom: '1.5rem', right: '1.5rem' };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20 pointer-events-none"
        aria-hidden="true"
      />

      {/* Tip card */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Walkthrough step ${stepIndex + 1} of ${steps.length}`}
        className="z-50 w-72 rounded-xl bg-white shadow-xl border border-slate-200 p-4 space-y-3"
        style={tipStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {stepIndex + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss walkthrough"
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <p className="font-semibold text-slate-900 text-sm">{currentStep.title}</p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{currentStep.description}</p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            disabled={stepIndex === 0}
            className="h-7 px-2 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={next} className="h-7 px-3 text-xs">
            {stepIndex < steps.length - 1 ? (
              <>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </>
            ) : (
              "Got it"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
