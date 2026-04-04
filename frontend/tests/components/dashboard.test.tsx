import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardView } from '@/app/components/dashboard';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

describe('DashboardView', () => {
  it('renders plan, metrics, and alert content', () => {
    render(
      <DashboardView
        profile={{
          id: 1,
          user_id: 1,
          name: 'Amina',
          age: 32,
          created_at: '2026-04-04T10:00:00.000Z',
          updated_at: '2026-04-04T10:00:00.000Z'
        }}
        metrics={[
          {
            id: 1,
            user_id: 1,
            weight_kg: 80,
            bmi: 24.7,
            steps: 8200,
            sleep_hours: 7.5,
            recorded_at: '2026-04-04T10:00:00.000Z',
            created_at: '2026-04-04T10:00:00.000Z',
            updated_at: '2026-04-04T10:00:00.000Z',
            processed: {
              weight_unit: 'kg',
              derived_bmi: 24.7,
              weight_trend: 'decreasing',
              bmi_trend: 'decreasing'
            }
          }
        ]}
        labs={[
          {
            id: 1,
            user_id: 1,
            test_name: 'ALT',
            value: 70,
            recorded_date: '2026-04-04',
            created_at: '2026-04-04T10:00:00.000Z',
            updated_at: '2026-04-04T10:00:00.000Z',
            processed: { normalized_value: 70, trend: 'increasing' },
            evaluation: {
              status: 'elevated',
              is_abnormal: true,
              rule_applied: true
            }
          }
        ]}
        plan={{
          intent: 'meal_plan',
          meals: [{ meal: 'breakfast', name: 'Oats and berries' }],
          activity: [{ title: 'Walk', frequency: 'Daily' }],
          behavioral_actions: ['Hydrate'],
          lab_insights: [],
          risks: [],
          recommendations: ['Reduce added sugar'],
          adherence_signals: [],
          constraints_applied: [],
          biomarker_adjustments: []
        }}
      />
    );

    expect(screen.getByText(/amina's overview/i)).toBeInTheDocument();
    expect(screen.getByText(/oats and berries/i)).toBeInTheDocument();
    expect(screen.getByText(/8200/)).toBeInTheDocument();
    expect(screen.getByText(/alt: elevated/i)).toBeInTheDocument();
  });

  it('shows empty states when no data is available', () => {
    render(<DashboardView profile={null} metrics={[]} labs={[]} plan={null} />);

    expect(screen.getByText(/today overview/i)).toBeInTheDocument();
    expect(screen.getByText(/no health metrics available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/generate a plan/i)).toBeInTheDocument();
  });
});
