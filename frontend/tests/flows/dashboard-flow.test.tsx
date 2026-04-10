import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from '@/app/dashboard/page';

const { apiClient } = vi.hoisted(() => ({
  apiClient: {
    fetchTodayPlan: vi.fn(),
    fetchHealthMetrics: vi.fn(),
    fetchLabs: vi.fn(),
    fetchProfile: vi.fn(),
    fetchTodayCheckIn: vi.fn(),
    fetchGamificationStatus: vi.fn(),
    fetchProgressSummary: vi.fn(),
    fetchWeeklyReport: vi.fn(),
    getLatestPlan: vi.fn()
  }
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock('@/lib/api-client', () => apiClient);

describe('Dashboard usage flow', () => {
  beforeEach(() => {
    Object.values(apiClient).forEach((mockFn) => mockFn.mockReset());
  });

  it('loads dashboard data and falls back to session plan when backend plan is missing', async () => {
    apiClient.fetchProfile.mockResolvedValue({
      id: 1,
      user_id: 1,
      name: 'Amina',
      age: 32,
      created_at: '2026-04-04T10:00:00.000Z',
      updated_at: '2026-04-04T10:00:00.000Z'
    });
    apiClient.fetchHealthMetrics.mockResolvedValue([]);
    apiClient.fetchLabs.mockResolvedValue([]);
    apiClient.fetchTodayCheckIn.mockResolvedValue(null);
    apiClient.fetchGamificationStatus.mockResolvedValue(null);
    apiClient.fetchProgressSummary.mockResolvedValue(null);
    apiClient.fetchWeeklyReport.mockResolvedValue(null);
    apiClient.fetchTodayPlan.mockResolvedValue(null);
    apiClient.getLatestPlan.mockReturnValue({
      intent: 'meal_plan',
      meals: [{ meal: 'dinner', name: 'Salmon bowl' }],
      activity: [],
      behavioral_actions: [],
      lab_insights: [],
      risks: [],
      recommendations: [],
      adherence_signals: [],
      constraints_applied: [],
      biomarker_adjustments: []
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/amina's overview/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/salmon bowl/i)).toBeInTheDocument();
  });

  it('shows the dashboard error state when loading fails', async () => {
    apiClient.fetchProfile.mockRejectedValue(new Error('Unable to load dashboard.'));
    apiClient.fetchHealthMetrics.mockResolvedValue([]);
    apiClient.fetchLabs.mockResolvedValue([]);
    apiClient.fetchTodayCheckIn.mockResolvedValue(null);
    apiClient.fetchGamificationStatus.mockResolvedValue(null);
    apiClient.fetchProgressSummary.mockResolvedValue(null);
    apiClient.fetchWeeklyReport.mockResolvedValue(null);
    apiClient.fetchTodayPlan.mockResolvedValue(null);
    apiClient.getLatestPlan.mockReturnValue(null);

    render(<DashboardPage />);

    expect(await screen.findByText(/dashboard unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/unable to load dashboard/i)).toBeInTheDocument();
  });
});
