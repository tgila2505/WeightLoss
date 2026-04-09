'use client';

import { useCallback, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export interface SharedPlan {
  slug: string;
  plan_data: Record<string, unknown>;
  views: number;
  created_at: string;
  expires_at: string | null;
}

export function useSharePlan() {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sharePlan = useCallback(async (planData: Record<string, unknown>): Promise<string | null> => {
    setSharing(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/shared-plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_data: planData }),
      });
      if (!res.ok) throw new Error('Failed to create share link');
      const plan: SharedPlan = await res.json();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/shared-plan/${plan.slug}`;
      setShareUrl(url);
      return url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return null;
    } finally {
      setSharing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setShareUrl(null);
    setError(null);
  }, []);

  return { sharePlan, sharing, shareUrl, error, reset };
}
