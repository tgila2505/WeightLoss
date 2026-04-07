import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OnboardingForm } from '@/app/onboarding/components/onboarding-form';

const { push, upsertProfile, setAiKeys } = vi.hoisted(() => ({
  push: vi.fn(),
  upsertProfile: vi.fn(),
  setAiKeys: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push })
}));

vi.mock('@/lib/api-client', () => ({
  upsertProfile: (...args: unknown[]) => upsertProfile(...args)
}));

vi.mock('@/lib/ai-keys', () => ({
  setAiKeys: (...args: unknown[]) => setAiKeys(...args)
}));

vi.mock('@/hooks/use-onboarding-progress', () => ({
  useOnboardingProgress: () => ({
    loading: false,
    progress: { currentStep: 0, formData: {}, completed: false },
    save: vi.fn(),
    markCompleted: vi.fn()
  })
}));

vi.mock('@/hooks/use-behavior-tracker', () => ({
  useBehaviorTracker: () => ({ track: vi.fn() })
}));

vi.mock('@/components/ui/select', () => {
  function Select({
    value,
    onValueChange
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) {
    return (
      <select
        data-testid="mock-select"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="">Select</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="non_binary">Non-binary</option>
        <option value="prefer_not_to_say">Prefer not to say</option>
        <option value="low">Low</option>
        <option value="moderate">Moderate</option>
        <option value="high">High</option>
      </select>
    );
  }

  function SelectTrigger({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    return <option value="">{placeholder ?? 'Select'}</option>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  function SelectItem({
    value,
    children
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    return <option value={value}>{children}</option>;
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
  };
});

describe('Onboarding flow', () => {
  beforeEach(() => {
    push.mockReset();
    upsertProfile.mockReset();
    setAiKeys.mockReset();
  });

  it('walks through onboarding and saves the profile', async () => {
    const user = userEvent.setup();
    upsertProfile.mockResolvedValue(undefined);

    render(<OnboardingForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Amina Khan');
    await user.type(screen.getByLabelText(/^age/i), '32');
    await user.type(screen.getByLabelText(/height \(cm\)/i), '170');
    await user.type(screen.getByLabelText(/current weight/i), '80');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await user.type(screen.getByLabelText(/target weight/i), '72');
    await user.type(screen.getByLabelText(/timeline/i), '12');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'moderate' }
    });
    await user.type(screen.getByLabelText(/average sleep/i), '7');
    await user.type(screen.getByLabelText(/diet pattern/i), 'balanced');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await user.type(screen.getByPlaceholderText('gsk_...'), 'groq-key');
    await user.type(screen.getByPlaceholderText(/mistral api key/i), 'mistral-key');
    await user.click(screen.getByRole('button', { name: /save and finish/i }));

    await waitFor(() => {
      expect(upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Amina Khan',
          age: '32',
          goal_target_weight_kg: '72'
        })
      );
    });

    expect(setAiKeys).toHaveBeenCalledWith('groq-key', 'mistral-key');
    await waitFor(() => {
      expect(screen.getByText(/onboarding saved/i)).toBeInTheDocument();
    });
  });

  it('shows the backend error when save fails', async () => {
    const user = userEvent.setup();
    upsertProfile.mockRejectedValue(new Error('Request failed.'));

    render(<OnboardingForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Amina Khan');
    await user.type(screen.getByLabelText(/^age/i), '32');
    await user.type(screen.getByLabelText(/height \(cm\)/i), '170');
    await user.type(screen.getByLabelText(/current weight/i), '80');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(screen.getByLabelText(/target weight/i), '72');
    await user.type(screen.getByLabelText(/timeline/i), '12');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getAllByTestId('mock-select')[0], {
      target: { value: 'moderate' }
    });
    await user.type(screen.getByLabelText(/average sleep/i), '7');
    await user.type(screen.getByLabelText(/diet pattern/i), 'balanced');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /skip and finish/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Request failed.');
    });
  });
});
