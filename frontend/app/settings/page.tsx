'use client';

import { useEffect, useState } from 'react';

import { PageShell } from '../components/page-shell';
import { fetchGamificationStatus } from '../../lib/api-client';
import { BadgeGallery } from '@/components/gamification/badge-gallery';

export default function SettingsPage() {
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  useEffect(() => {
    fetchGamificationStatus().then(g => setEarnedBadges(g.badges)).catch(() => {});
  }, []);

  return (
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
          Settings
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Account settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account and view your achievements.
        </p>
      </div>

      <div className="max-w-xl space-y-4">
        {/* Phase 13: Badge gallery */}
        <BadgeGallery earnedBadges={earnedBadges} />
      </div>
    </PageShell>
  );
}
