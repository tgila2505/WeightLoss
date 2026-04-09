'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { AiFeedback } from '@/lib/api-client';

type Props = {
  feedback: AiFeedback | null;
  status: 'idle' | 'generating' | 'ready';
};

function FeedbackSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-4 bg-slate-200 rounded w-full" />
      <div className="h-4 bg-slate-200 rounded w-5/6" />
    </div>
  );
}

export function AiFeedbackCard({ feedback, status }: Props) {
  if (status === 'idle') {
    return null;
  }

  return (
    <Card className="border-blue-100 bg-blue-50">
      <CardContent className="py-4 space-y-3">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          🤖 Your AI Coach
        </p>
        {status === 'generating' ? (
          <FeedbackSkeleton />
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            {feedback?.insight && <p>{feedback.insight}</p>}
            {feedback?.meal_focus && (
              <p className="text-blue-800">
                <span className="font-medium">Focus: </span>{feedback.meal_focus}
              </p>
            )}
            {feedback?.encouragement && (
              <p className="italic text-slate-500">{feedback.encouragement}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
