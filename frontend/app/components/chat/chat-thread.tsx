'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessageItem } from '@/lib/api-client';
import { ChatBubble } from './chat-bubble';
import { ConsultationIndicator } from './consultation-indicator';
import { StreamingBubble } from './streaming-bubble';

type Props = {
  messages: ChatMessageItem[];
  agent: string;
  isConsulting: boolean;
  streamingContent: string | null;
};

export function ChatThread({ messages, agent, isConsulting, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isConsulting, streamingContent]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !isConsulting && !streamingContent ? (
        <p className="text-center text-sm text-slate-400 mt-8">
          No messages yet. Ask a question to get started.
        </p>
      ) : null}
      {messages.map((msg, i) => (
        <ChatBubble
          key={`${msg.created_at}-${i}`}
          role={msg.role}
          content={msg.content}
          agent={agent}
        />
      ))}
      {isConsulting ? <ConsultationIndicator agent={agent} /> : null}
      {streamingContent !== null && !isConsulting ? (
        <StreamingBubble content={streamingContent} agent={agent} />
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
