import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PlanView } from '@/app/components/plan';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock('@/app/components/checklist', () => ({
  Checklist: ({ items }: { items: Array<{ name: string }> }) => (
    <div>{items.map((item) => item.name).join(', ')}</div>
  )
}));

describe('PlanView', () => {
  it('renders the current plan details', () => {
    render(
      <PlanView
        plan={{
          intent: 'meal_plan',
          meals: [{ meal: 'breakfast', name: 'Oats' }],
          activity: [{ title: 'Walk', frequency: 'Daily' }],
          behavioral_actions: ['Hydrate'],
          lab_insights: [],
          risks: [],
          recommendations: ['Add protein'],
          adherence_signals: [],
          constraints_applied: [],
          biomarker_adjustments: []
        }}
      />
    );

    expect(screen.getByText(/daily breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/oats/i)).toBeInTheDocument();
    expect(screen.getByText(/walk/i)).toBeInTheDocument();
    expect(screen.getByText(/hydrate, add protein/i)).toBeInTheDocument();
  });

  it('shows the empty state when there is no plan', () => {
    render(<PlanView plan={null} />);

    expect(screen.getByText(/generate a plan from the interaction page/i)).toBeInTheDocument();
  });
});
