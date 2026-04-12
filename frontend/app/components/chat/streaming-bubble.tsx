'use client';

import { useEffect, useRef } from 'react';

const AGENT_EMOJI: Record<string, string> = {
  gp: '🩺',
  endo: '🔬',
  dietitian: '🥗',
  trainer: '💪',
  panel: '👥',
};

const AGENT_NAME: Record<string, string> = {
  gp: 'General Practitioner',
  endo: 'Endocrinologist',
  dietitian: 'Dietitian',
  trainer: 'Personal Trainer',
  panel: 'Medical Panel',
};

type Props = {
  content: string;
  agent: string;
};

export function StreamingBubble({ content, agent }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [content]);

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base">
        {AGENT_EMOJI[agent] ?? '🩺'}
      </div>
      <div className="max-w-[75%] rounded-[2px_12px_12px_12px] border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed">
        {content}
        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-slate-400" />
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
          {AGENT_NAME[agent] ?? agent}
        </p>
      </div>
      <div ref={endRef} />
    </div>
  );
}
