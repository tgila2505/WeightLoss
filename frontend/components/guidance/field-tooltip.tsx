'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface FieldTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Lightweight inline tooltip for form fields.
 * Hover or focus-visible to reveal. No external dependency.
 */
export function FieldTooltip({ content, side = 'top' }: FieldTooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClass =
    side === 'bottom'
      ? 'top-full mt-2 left-1/2 -translate-x-1/2'
      : side === 'left'
        ? 'right-full mr-2 top-1/2 -translate-y-1/2'
        : side === 'right'
          ? 'left-full ml-2 top-1/2 -translate-y-1/2'
          : 'bottom-full mb-2 left-1/2 -translate-x-1/2';

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="Help"
        className="ml-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 w-56 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-lg ${positionClass}`}
        >
          {content}
          <span className="sr-only">{content}</span>
        </span>
      )}
    </span>
  );
}
