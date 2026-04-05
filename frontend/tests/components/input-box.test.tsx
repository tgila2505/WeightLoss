import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InputBox } from '@/app/components/input-box';

describe('InputBox', () => {
  it('submits trimmed text and clears the field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<InputBox onSubmit={onSubmit} isSubmitting={false} />);

    await user.type(
      screen.getByPlaceholderText(/ask for a refreshed plan/i),
      '   Need a higher protein lunch plan   '
    );
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith('Need a higher protein lunch plan');
    expect(screen.getByPlaceholderText(/ask for a refreshed plan/i)).toHaveValue('');
  });

  it('does not submit an empty prompt', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<InputBox onSubmit={onSubmit} isSubmitting={false} />);

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
