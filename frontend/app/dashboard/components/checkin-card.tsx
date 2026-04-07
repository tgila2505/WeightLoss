'use client';

import { useState } from 'react';
import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { submitCheckIn, type AiFeedback, type CheckInPayload } from '@/lib/api-client';
import { AiFeedbackCard } from './ai-feedback-card';

type Adherence = 'on_track' | 'partial' | 'off_track';

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];

const ADHERENCE_OPTIONS: { value: Adherence; label: string }[] = [
  { value: 'on_track', label: 'On track' },
  { value: 'partial', label: 'Partial' },
  { value: 'off_track', label: 'Off track' },
];

type Props = {
  currentStreak: number;
  onSubmitted?: (streak: number, feedback: AiFeedback | null) => void;
};

export function CheckInCard({ currentStreak, onSubmitted }: Props) {
  const [mood, setMood] = useState<number | null>(null);
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [weightKg, setWeightKg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!mood || !adherence) return;
    setSubmitting(true);
    setError('');

    const payload: CheckInPayload = {
      mood,
      adherence,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
    };

    try {
      const result = await submitCheckIn(payload);
      setSubmitted(true);
      setFeedbackStatus(result.ai_feedback_status === 'ready' ? 'ready' : 'generating');
      setFeedback(result.ai_feedback);
      onSubmitted?.(result.streak.current, result.ai_feedback);

      // Poll for feedback if generating
      if (result.ai_feedback_status === 'generating') {
        pollFeedback();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function pollFeedback(attempts = 0) {
    if (attempts >= 10) return;
    await new Promise(r => setTimeout(r, 2000));
    try {
      const { fetchFeedbackStatus } = await import('@/lib/api-client');
      const status = await fetchFeedbackStatus();
      if (status.status === 'ready' && status.ai_feedback) {
        setFeedback(status.ai_feedback);
        setFeedbackStatus('ready');
      } else if (status.status === 'generating') {
        pollFeedback(attempts + 1);
      }
    } catch {
      // silently stop polling
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-green-800">Check-in submitted!</p>
                <p className="text-sm text-green-700">
                  <Flame className="inline w-4 h-4 text-orange-500" /> {currentStreak}-day streak
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <AiFeedbackCard feedback={feedback} status={feedbackStatus} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Daily Check-In</CardTitle>
          {currentStreak > 0 && (
            <span className="flex items-center gap-1 text-sm font-medium text-orange-600">
              <Flame className="w-4 h-4" /> {currentStreak}-day streak
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Mood */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">How are you feeling?</p>
          <div className="flex gap-2">
            {MOOD_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setMood(i + 1)}
                className={`text-2xl p-2 rounded-lg transition-all ${
                  mood === i + 1
                    ? 'bg-blue-100 ring-2 ring-blue-400 scale-110'
                    : 'hover:bg-slate-100'
                }`}
                aria-label={`Mood ${i + 1}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Adherence */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">How was your plan today?</p>
          <div className="flex gap-2">
            {ADHERENCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAdherence(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  adherence === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-300 text-slate-600 hover:border-blue-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weight (optional) */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Weight today <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="20"
              max="400"
              placeholder="kg"
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
              className="w-24 px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-sm text-slate-400">kg</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={!mood || !adherence || submitting}
          className="w-full"
        >
          {submitting ? 'Submitting…' : 'Submit Check-In'}
        </Button>
      </CardContent>
    </Card>
  );
}
