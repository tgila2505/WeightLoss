'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type ChatAgent,
  type ChatMessageItem,
  getChatHistory,
  startNewConversation,
  streamChatMessage,
  fetchAdherenceSummary,
} from '@/lib/api-client';
import { AgentSidebar } from './chat/agent-sidebar';
import { ChatThread } from './chat/chat-thread';
import { UpgradePrompt } from './chat/upgrade-prompt';
import { InputBox } from './input-box';

export function InteractionView() {
  const [activeAgent, setActiveAgent] = useState<ChatAgent>('gp');
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [isGated, setIsGated] = useState(false);
  const [consistencyLevel, setConsistencyLevel] = useState<string | null>(null);
  const [planRefreshNeeded, setPlanRefreshNeeded] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async (agent: ChatAgent) => {
    setError('');
    try {
      const history = await getChatHistory(agent);
      setConversationId(history.conversation_id);
      setMessages(history.messages);
    } catch (err) {
      if (err instanceof Error && err.message === 'FEATURE_GATED') {
        setIsGated(true);
      } else {
        setError('Failed to load conversation history.');
      }
    }
  }, []);

  useEffect(() => {
    loadHistory(activeAgent);
    fetchAdherenceSummary()
      .then((summary) => {
        if (summary) {
          setConsistencyLevel(summary.consistency_level);
          setPlanRefreshNeeded(summary.plan_refresh_needed);
        }
      })
      .catch(() => {});
  }, [activeAgent, loadHistory]);

  async function handleSelectAgent(agent: ChatAgent) {
    if (isStreaming) return;
    setActiveAgent(agent);
    setStreamingContent(null);
    setIsConsulting(false);
    setIsGated(false);
    setError('');
  }

  async function handleNewConversation() {
    if (isStreaming) return;
    try {
      const newId = await startNewConversation(activeAgent);
      setConversationId(newId);
      setMessages([]);
      setStreamingContent(null);
      setIsConsulting(false);
      setIsGated(false);
      setError('');
    } catch {
      setError('Failed to start new conversation.');
    }
  }

  async function handleSubmit(prompt: string) {
    if (!conversationId || isStreaming) return;
    setError('');
    setIsConsulting(true);
    setIsStreaming(true);
    setStreamingContent(null);

    // Add user message optimistically
    const userMsg: ChatMessageItem = {
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = '';
    let firstToken = true;
    try {
      for await (const token of streamChatMessage({
        agent: activeAgent,
        message: prompt,
        conversation_id: conversationId,
      })) {
        // First token: hide consultation indicator, show streaming bubble.
        // Use a local variable (not React state) to avoid stale closure reads.
        if (firstToken) {
          setIsConsulting(false);
          firstToken = false;
        }
        accumulated += token;
        setStreamingContent(accumulated);
      }

      // Stream complete — promote to permanent message
      if (accumulated) {
        const assistantMsg: ChatMessageItem = {
          role: 'assistant',
          content: accumulated,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'FEATURE_GATED') {
        setIsGated(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to reach the assistant. Please try again.'
        );
      }
    } finally {
      setStreamingContent(null);
      setIsConsulting(false);
      setIsStreaming(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64">
      <div className="mx-auto flex h-[calc(100vh-0px)] max-w-5xl flex-col px-4 py-8">
        {/* Adherence banner */}
        {planRefreshNeeded ? (
          <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <strong>Your adherence patterns have changed.</strong> Consistency level:{' '}
            <em>{consistencyLevel}</em>. Ask your GP or Medical Panel for an updated plan.
          </div>
        ) : null}

        {/* Page header */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Chat
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Your Medical Panel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ask your specialists anything. Every response is reviewed by your GP before delivery.
          </p>
        </div>

        {isGated ? (
          <UpgradePrompt />
        ) : (
          <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Agent selector sidebar */}
            <AgentSidebar
              activeAgent={activeAgent}
              onSelectAgent={handleSelectAgent}
              onNewConversation={handleNewConversation}
              isStreaming={isStreaming}
            />

            {/* Chat area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <ChatThread
                messages={messages}
                agent={activeAgent}
                isConsulting={isConsulting}
                streamingContent={streamingContent}
              />

              {/* Input */}
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                {error ? (
                  <p className="mb-2 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
                <InputBox onSubmit={handleSubmit} isSubmitting={isStreaming} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
