import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionView } from '@/app/components/interaction';

const { apiClient, hasAiKeys } = vi.hoisted(() => ({
  apiClient: {
    appendInteractionHistory: vi.fn(),
    fetchAdherenceSummary: vi.fn(),
    fetchTodayPlan: vi.fn(),
    fetchHealthMetrics: vi.fn(),
    fetchLabs: vi.fn(),
    fetchProfile: vi.fn(),
    getInteractionHistory: vi.fn(),
    getLatestPlan: vi.fn(),
    persistLatestPlan: vi.fn(),
    saveLatestPlan: vi.fn(),
    submitOrchestratorRequest: vi.fn()
  },
  hasAiKeys: vi.fn()
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock('@/lib/api-client', () => apiClient);
vi.mock('@/lib/ai-keys', () => ({
  hasAiKeys: () => hasAiKeys()
}));

describe('Plan generation flow', () => {
  beforeEach(() => {
    Object.values(apiClient).forEach((mockFn) => mockFn.mockReset());
    hasAiKeys.mockReset();

    apiClient.getInteractionHistory.mockReturnValue([]);
    apiClient.getLatestPlan.mockReturnValue(null);
    apiClient.fetchTodayPlan.mockResolvedValue(null);
    apiClient.fetchAdherenceSummary.mockResolvedValue(null);
    apiClient.persistLatestPlan.mockResolvedValue(undefined);
    apiClient.fetchProfile.mockResolvedValue({ id: 1, user_id: 1, name: 'Amina', age: 32 });
    apiClient.fetchHealthMetrics.mockResolvedValue([]);
    apiClient.fetchLabs.mockResolvedValue([]);
    apiClient.submitOrchestratorRequest.mockResolvedValue({
      content: 'Here is your updated plan.',
      status: 'ok',
      data: {},
      metadata: {
        final_plan: {
          intent: 'meal_plan',
          meals: [{ meal: 'lunch', name: 'Chicken bowl' }],
          activity: [{ title: 'Walk', frequency: 'Daily' }],
          behavioral_actions: ['Hydrate'],
          lab_insights: [],
          risks: [],
          recommendations: ['Add vegetables'],
          adherence_signals: [{ name: 'Hydrate', completed: false }],
          constraints_applied: [],
          biomarker_adjustments: []
        }
      }
    });
  });

  it('submits a prompt and persists the generated plan', async () => {
    const user = userEvent.setup();
    hasAiKeys.mockReturnValue(true);

    render(<InteractionView />);

    await user.type(
      screen.getByPlaceholderText(/ask for a refreshed plan/i),
      'Build me a higher protein meal plan'
    );
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(apiClient.submitOrchestratorRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Build me a higher protein meal plan',
          intent: 'meal_plan'
        })
      );
    });

    expect(apiClient.saveLatestPlan).toHaveBeenCalled();
    expect(apiClient.persistLatestPlan).toHaveBeenCalled();
    expect(apiClient.appendInteractionHistory).toHaveBeenCalled();
    expect(apiClient.getInteractionHistory).toHaveBeenCalledTimes(2);
  });

  it('shows the AI configuration banner when keys are missing', async () => {
    hasAiKeys.mockReturnValue(false);

    render(<InteractionView />);

    expect(await screen.findByText(/ai not configured/i)).toBeInTheDocument();
  });
});
