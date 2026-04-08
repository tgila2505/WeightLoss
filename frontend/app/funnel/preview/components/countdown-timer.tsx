'use client';

import { useEffect, useState } from 'react';

const TIMER_KEY = '_funnel_timer_end';
const DURATION_MS = 24 * 60 * 60 * 1000;

function getOrInitEndTime(): number {
  const stored = sessionStorage.getItem(TIMER_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) return parsed;
  }
  const end = Date.now() + DURATION_MS;
  sessionStorage.setItem(TIMER_KEY, String(end));
  return end;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function CountdownTimer() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const expired = remainingMs !== null && remainingMs <= 0;

  useEffect(() => {
    const endTime = getOrInitEndTime();
    setRemainingMs(endTime - Date.now());
    const interval = setInterval(() => {
      setRemainingMs(endTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remainingMs === null) return null;

  return (
    <div className={`text-center text-sm ${expired ? 'text-amber-600' : 'text-slate-500'}`}>
      {expired ? (
        <p className="font-medium">Your plan is ready. Do not lose it.</p>
      ) : (
        <p>
          Your session plan expires in{' '}
          <span className="font-mono font-semibold text-slate-900">
            {formatRemaining(remainingMs)}
          </span>
        </p>
      )}
    </div>
  );
}
