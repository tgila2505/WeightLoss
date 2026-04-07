'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export interface ReferralStats {
  code: string | null;
  clicks: number;
  signups: number;
  conversions: number;
  rewards_earned: number;
  premium_until: string | null;
}

async function authFetch(path: string) {
  const token = getAccessToken();
  return fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

export function useReferral() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/referrals/me/stats');
      if (!res.ok) throw new Error('Failed to load referral stats');
      setStats(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getReferralLink = useCallback(() => {
    if (!stats?.code) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/referral/${stats.code}`;
  }, [stats?.code]);

  return { stats, loading, error, refresh: fetchStats, getReferralLink };
}

export async function trackReferralClick(code: string): Promise<void> {
  try {
    await fetch(`${apiBaseUrl}/api/v1/referrals/click/${code}`, { method: 'POST' });
  } catch {
    // best-effort — don't block page load
  }
}
