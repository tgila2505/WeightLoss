'use client';

import { AGENT_NAME } from './agents';

type Props = { agent: string };

export function ConsultationIndicator({ agent }: Props) {
  const personaName = AGENT_NAME[agent as keyof typeof AGENT_NAME] ?? agent;
  const isPanel = agent === 'panel' || agent === 'gp';

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-base">
        ⏳
      </div>
      <div className="max-w-[85%] rounded-[2px_12px_12px_12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <em>
          Internal consultation is currently underway between your{' '}
          {isPanel ? 'Medical Panel' : personaName} and General Practitioner, before a response
          is given back. Please wait.
        </em>
      </div>
    </div>
  );
}
