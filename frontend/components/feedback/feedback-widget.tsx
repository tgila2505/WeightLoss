'use client';

import { useRef, useState } from 'react';
import { MessageSquarePlus, X, Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitFeedback } from '@/lib/api-client';
import { getSessionId } from '@/lib/session-id';

interface FeedbackWidgetProps {
  /** Page or feature context, e.g. "dashboard", "onboarding/step-2" */
  context?: string;
}

/**
 * Floating feedback button.
 * Opens a panel with 1–5 star rating + optional text.
 * Submits to POST /api/v1/feedback (fire-and-forget; never blocks UX).
 */
export function FeedbackWidget({ context }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const textRef = useRef<HTMLTextAreaElement>(null);

  function reset() {
    setRating(0);
    setHovered(0);
    setText('');
    setStatus('idle');
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  async function handleSubmit() {
    if (rating === 0 && text.trim() === '') return;
    setStatus('sending');
    try {
      await submitFeedback({
        session_id: getSessionId(),
        feedback_type: rating > 0 && text.trim() ? 'mixed' : rating > 0 ? 'rating' : 'text',
        rating: rating > 0 ? rating : undefined,
        text: text.trim() || undefined,
        context,
      });
      setStatus('sent');
      setTimeout(() => setOpen(false), 1200);
    } catch {
      // Never crash the UX on feedback failure
      setStatus('sent');
      setTimeout(() => setOpen(false), 1200);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Share feedback"
          className="w-72 rounded-xl bg-white shadow-2xl border border-slate-200 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900 text-sm">Share feedback</p>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close feedback"
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {status === 'sent' ? (
            <p className="text-sm text-emerald-600 font-medium text-center py-2">
              Thanks — feedback received!
            </p>
          ) : (
            <>
              <div>
                <p className="text-xs text-slate-500 mb-2">How is your experience?</p>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} star`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          star <= (hovered || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us more (optional)…"
                className="min-h-[72px] resize-none text-sm"
                maxLength={500}
              />

              <Button
                onClick={handleSubmit}
                disabled={status === 'sending' || (rating === 0 && text.trim() === '')}
                className="w-full h-8 text-xs"
                size="sm"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-3.5 w-3.5" /> Send feedback
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close feedback' : 'Give feedback'}
        className="flex items-center gap-2 rounded-full bg-slate-900 text-white text-xs font-medium px-4 py-2.5 shadow-lg hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>
    </div>
  );
}
