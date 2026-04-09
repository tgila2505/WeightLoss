'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ALL_BADGES: { id: string; emoji: string; label: string; description: string }[] = [
  { id: 'first_checkin', emoji: '🌱', label: 'First Check-In', description: 'You started your journey.' },
  { id: 'week_streak', emoji: '🔥', label: 'Habit Builder', description: '7-day streak' },
  { id: 'month_streak', emoji: '🏆', label: 'Consistent', description: '30-day streak' },
  { id: '60_day_streak', emoji: '💎', label: 'Committed', description: '60-day streak' },
  { id: '100_day_streak', emoji: '⚡', label: 'Unstoppable', description: '100-day streak' },
  { id: 'first_kilo', emoji: '📉', label: 'First Drop', description: 'First weight loss logged' },
  { id: 'halfway', emoji: '🎯', label: 'Halfway', description: '50% of goal reached' },
  { id: 'goal_reached', emoji: '🏁', label: 'Goal Achieved', description: 'Goal weight reached' },
  { id: '10_checkins', emoji: '📊', label: 'Data Nerd', description: '10 check-ins' },
  { id: '50_checkins', emoji: '📅', label: 'Dedicated', description: '50 check-ins' },
  { id: 'ai_explorer', emoji: '🤖', label: 'AI Explorer', description: 'Used meal suggestion 10 times' },
];

type Props = {
  earnedBadges: string[];
};

export function BadgeGallery({ earnedBadges }: Props) {
  const earnedSet = new Set(earnedBadges);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Badges</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {ALL_BADGES.map(badge => {
            const earned = earnedSet.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center p-3 rounded-xl border text-center ${
                  earned
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-100 bg-slate-50 opacity-40 grayscale'
                }`}
                title={badge.description}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <p className="text-xs font-medium text-slate-700 mt-1">{badge.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
