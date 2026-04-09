'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReferral } from '@/hooks/use-referral';

interface ReferralWidgetProps {
  className?: string;
}

export function ReferralWidget({ className }: ReferralWidgetProps) {
  const { stats, loading, getReferralLink } = useReferral();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const link = getReferralLink();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="h-5 w-32 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-4 w-full rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const link = getReferralLink();

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">Refer a friend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {link ? (
          <>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <span className="flex-1 truncate text-muted-foreground">{link}</span>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-xl font-semibold">{stats?.clicks ?? 0}</p>
                <p className="text-muted-foreground">Clicks</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{stats?.signups ?? 0}</p>
                <p className="text-muted-foreground">Signups</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{stats?.rewards_earned ?? 0}</p>
                <p className="text-muted-foreground">Rewards</p>
              </div>
            </div>
            {stats?.premium_until && (
              <p className="text-xs text-muted-foreground">
                Premium until{' '}
                {new Date(stats.premium_until).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Loading your referral link…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
