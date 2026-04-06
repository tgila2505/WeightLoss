'use client';

import { type FormEvent, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function InputBox({
  onSubmit,
  isSubmitting
}: Readonly<{
  onSubmit: (prompt: string) => Promise<void>;
  isSubmitting: boolean;
}>) {
  const [value, setValue] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() === '') {
      return;
    }

    await onSubmit(value.trim());
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask for a refreshed plan, a meal tweak, or a quick summary."
        className="min-h-[120px] resize-y"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || value.trim() === ''}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
