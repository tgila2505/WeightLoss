'use client';

import { AGENT_EMOJI, AGENT_NAME } from './agents';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
};

export function ChatBubble({ role, content, agent }: Props) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-[12px_2px_12px_12px] bg-blue-600 px-4 py-2.5 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base">
        {AGENT_EMOJI[agent as keyof typeof AGENT_EMOJI] ?? '🩺'}
      </div>
      <div className="max-w-[75%] rounded-[2px_12px_12px_12px] border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed">
        {content}
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
          {AGENT_NAME[agent as keyof typeof AGENT_NAME] ?? agent}
        </p>
      </div>
    </div>
  );
}
