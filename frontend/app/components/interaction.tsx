'use client';

import { useEffect, useState } from 'react';

import {
  appendInteractionHistory,
  fetchTodayPlan,
  fetchHealthMetrics,
  fetchLabs,
  fetchProfile,
  getInteractionHistory,
  getLatestPlan,
  persistLatestPlan,
  saveLatestPlan,
  submitOrchestratorRequest,
  type InteractionHistoryItem,
  type OrchestratorIntent,
  type OrchestratorResponse,
  type PlanSnapshot
} from '../../lib/api-client';
import { InputBox } from './input-box';

export function InteractionView() {
  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [latestPlan, setLatestPlan] = useState<PlanSnapshot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadInitialState() {
      setHistory(getInteractionHistory());

      try {
        const storedPlan = await fetchTodayPlan();
        if (!isMounted) {
          return;
        }
        setLatestPlan(storedPlan ?? getLatestPlan());
      } catch {
        if (!isMounted) {
          return;
        }
        setLatestPlan(getLatestPlan());
      }
    }

    loadInitialState();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(prompt: string) {
    setIsSubmitting(true);
    setError('');

    try {
      const [profile, metrics, labs] = await Promise.all([
        fetchProfile(),
        fetchHealthMetrics(),
        fetchLabs()
      ]);

      const intent = inferIntent(prompt);
      const response = await submitOrchestratorRequest({
        prompt,
        intent,
        profile,
        metrics,
        labs,
        adherenceSignals: latestPlan?.adherence_signals ?? []
      });

      await applyResponse(prompt, response);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to reach the assistant.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function applyResponse(prompt: string, response: OrchestratorResponse) {
    const finalPlan = response.metadata.final_plan ?? null;
    if (finalPlan) {
      await persistLatestPlan(finalPlan);
      saveLatestPlan(finalPlan);
      setLatestPlan(finalPlan);
    }

    const item = {
      prompt,
      reply: response.content,
      created_at: new Date().toISOString()
    };
    appendInteractionHistory(item);
    setHistory(getInteractionHistory());
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Interaction</p>
        <h1 style={{ margin: '4px 0 8px' }}>Ask for an updated plan</h1>
        <p style={mutedStyle}>
          Submit a question or request to the orchestrator. The latest plan is kept for this session.
        </p>
        <div style={{ marginTop: '20px' }}>
          <InputBox onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
        {error ? <p style={{ color: '#b91c1c', marginTop: '14px' }}>{error}</p> : null}
      </section>

      <section style={{ ...cardStyle, marginTop: '20px' }}>
        <h2 style={{ marginTop: 0 }}>Session responses</h2>
        {history.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {history.map((item) => (
              <article key={`${item.created_at}-${item.prompt}`} style={entryStyle}>
                <p style={{ margin: '0 0 6px', color: '#1d4ed8', fontWeight: 600 }}>{item.prompt}</p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.reply}</p>
              </article>
            ))}
          </div>
        ) : (
          <p style={mutedStyle}>No interaction history in this session yet.</p>
        )}
      </section>
    </main>
  );
}

function inferIntent(prompt: string): OrchestratorIntent {
  const normalized = prompt.toLowerCase();
  if (normalized.includes('meal') || normalized.includes('plan')) {
    return 'meal_plan';
  }
  if (normalized.includes('trend') || normalized.includes('track')) {
    return 'tracking';
  }
  if (normalized.includes('today') || normalized.includes('overview')) {
    return 'dashboard';
  }
  return 'question';
}

const pageStyle = {
  minHeight: '100vh',
  padding: '32px 16px',
  maxWidth: '960px',
  margin: '0 auto'
} as const;

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '18px',
  padding: '24px',
  boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)'
} as const;

const eyebrowStyle = {
  margin: 0,
  color: '#2563eb',
  fontWeight: 600,
  fontSize: '14px'
} as const;

const mutedStyle = {
  margin: 0,
  color: '#64748b'
} as const;

const entryStyle = {
  borderRadius: '14px',
  backgroundColor: '#f8fafc',
  padding: '14px'
} as const;
