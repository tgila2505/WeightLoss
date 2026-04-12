'use client';

import { cn } from '@/lib/utils';
import type { ChatAgent } from '@/lib/api-client';

const AGENTS: { value: ChatAgent; emoji: string; name: string; description: string }[] = [
  { value: 'gp', emoji: '🩺', name: 'General Practitioner', description: 'Holistic health' },
  { value: 'endo', emoji: '🔬', name: 'Endocrinologist', description: 'Labs & metabolic health' },
  { value: 'dietitian', emoji: '🥗', name: 'Dietitian', description: 'Nutrition & meal plans' },
  { value: 'trainer', emoji: '💪', name: 'Personal Trainer', description: 'Exercise & fitness' },
  { value: 'panel', emoji: '👥', name: 'Medical Panel', description: 'Full panel consultation' },
];

type Props = {
  activeAgent: ChatAgent;
  onSelectAgent: (agent: ChatAgent) => void;
  onNewConversation: () => void;
  isStreaming: boolean;
};

export function AgentSidebar({ activeAgent, onSelectAgent, onNewConversation, isStreaming }: Props) {
  return (
    <div className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Specialists
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {AGENTS.map(({ value, emoji, name, description }) => (
          <button
            key={value}
            onClick={() => !isStreaming && onSelectAgent(value)}
            disabled={isStreaming}
            className={cn(
              'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
              value === activeAgent
                ? 'border-l-2 border-blue-600 bg-blue-50'
                : 'border-l-2 border-transparent hover:bg-slate-100',
              value === 'panel' ? 'mt-2 border-t border-slate-200 pt-3' : ''
            )}
          >
            <span className="text-sm font-semibold text-slate-800">
              {emoji} {name}
            </span>
            <span className="text-[11px] text-slate-500">{description}</span>
            {value === activeAgent ? (
              <span className="text-[10px] font-semibold text-blue-500">Active</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="border-t border-slate-200 px-3 py-3">
        <button
          onClick={onNewConversation}
          disabled={isStreaming}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          + New conversation
        </button>
      </div>
    </div>
  );
}
