'use client';

import { useCallback, useEffect, useRef } from 'react';
import { logBehaviorSignal } from '@/lib/api-client';
import { getSessionId } from '@/lib/session-id';

type SignalType = 'rage_click' | 'drop_off' | 'hesitation' | 'repeated_action' | 'abandonment';

interface UseTrackerOptions {
  /** Page/feature label, e.g. "onboarding/step-2" */
  context: string;
  /** Fire hesitation signal after this many ms of inactivity (default 30 000) */
  hesitationThresholdMs?: number;
}

/**
 * Passive UX signal tracker.
 * - Detects rage clicks (3+ rapid clicks on same element within 600 ms).
 * - Detects hesitation (no interaction for N seconds).
 * - Detects abandonment on page unload / visibility change.
 * - Call track() manually for repeated_action or drop_off signals.
 */
export function useBehaviorTracker({ context, hesitationThresholdMs = 30_000 }: UseTrackerOptions) {
  const clickLog = useRef<{ target: string; ts: number }[]>([]);
  const hesitationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abandoned = useRef(false);

  function send(type: SignalType, properties: Record<string, unknown> = {}) {
    logBehaviorSignal({
      session_id: getSessionId(),
      signal_type: type,
      context,
      properties,
    }).catch(() => {});
  }

  function resetHesitation() {
    if (hesitationTimer.current) clearTimeout(hesitationTimer.current);
    hesitationTimer.current = setTimeout(() => {
      send('hesitation', { threshold_ms: hesitationThresholdMs });
    }, hesitationThresholdMs);
  }

  function handleClick(e: MouseEvent) {
    resetHesitation();
    const target =
      (e.target as HTMLElement)?.id ||
      (e.target as HTMLElement)?.className?.toString().slice(0, 40) ||
      'unknown';
    const now = Date.now();
    clickLog.current = clickLog.current.filter((c) => now - c.ts < 600 && c.target === target);
    clickLog.current.push({ target, ts: now });
    if (clickLog.current.length >= 3) {
      send('rage_click', { target, count: clickLog.current.length });
      clickLog.current = [];
    }
  }

  function handleUnload() {
    if (!abandoned.current) {
      abandoned.current = true;
      send('abandonment', { trigger: 'unload' });
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden' && !abandoned.current) {
      abandoned.current = true;
      send('abandonment', { trigger: 'visibility_hidden' });
    }
  }

  useEffect(() => {
    document.addEventListener('click', handleClick);
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetHesitation();

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hesitationTimer.current) clearTimeout(hesitationTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  const track = useCallback(
    (type: SignalType, properties?: Record<string, unknown>) => {
      send(type, properties);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context],
  );

  return { track };
}
