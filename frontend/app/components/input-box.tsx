'use client';

import { useState } from 'react';

export function InputBox({
  onSubmit,
  isSubmitting
}: Readonly<{
  onSubmit: (prompt: string) => Promise<void>;
  isSubmitting: boolean;
}>) {
  const [value, setValue] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() === '') {
      return;
    }

    await onSubmit(value.trim());
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask for a refreshed plan, a meal tweak, or a quick summary."
        style={textareaStyle}
      />
      <button type="submit" disabled={isSubmitting || value.trim() === ''} style={buttonStyle}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}

const formStyle = {
  display: 'grid',
  gap: '12px'
} as const;

const textareaStyle = {
  width: '100%',
  minHeight: '120px',
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box' as const,
  font: 'inherit',
  resize: 'vertical' as const
} as const;

const buttonStyle = {
  justifySelf: 'flex-end',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 18px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer'
} as const;
