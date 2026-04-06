/**
 * Design Tokens — single source of truth for the WeightLoss design system.
 *
 * Color values map to the CSS custom properties defined in app/globals.css.
 * Tailwind utilities are configured in tailwind.config.ts using these same variables.
 *
 * Usage in TSX (inline styles or non-Tailwind contexts):
 *   import { tokens } from '@/lib/tokens'
 *   style={{ color: tokens.colors.primary }}
 *
 * In Tailwind: use the named utilities (e.g. `text-primary`, `bg-success`)
 */

export const tokens = {
  colors: {
    // Core
    background:            'hsl(var(--background))',
    foreground:            'hsl(var(--foreground))',
    border:                'hsl(var(--border))',
    input:                 'hsl(var(--input))',
    ring:                  'hsl(var(--ring))',
    // Brand / primary
    primary:               'hsl(var(--primary))',
    primaryForeground:     'hsl(var(--primary-foreground))',
    // Neutral
    secondary:             'hsl(var(--secondary))',
    secondaryForeground:   'hsl(var(--secondary-foreground))',
    muted:                 'hsl(var(--muted))',
    mutedForeground:       'hsl(var(--muted-foreground))',
    accent:                'hsl(var(--accent))',
    accentForeground:      'hsl(var(--accent-foreground))',
    // Semantic
    destructive:           'hsl(var(--destructive))',
    destructiveForeground: 'hsl(var(--destructive-foreground))',
    success:               'hsl(var(--success))',
    successForeground:     'hsl(var(--success-foreground))',
    warning:               'hsl(var(--warning))',
    warningForeground:     'hsl(var(--warning-foreground))',
    // Surface
    card:                  'hsl(var(--card))',
    cardForeground:        'hsl(var(--card-foreground))',
  },

  typography: {
    // Font sizes follow Tailwind's scale
    size: {
      xs:    '0.75rem',   // text-xs   — captions, badges
      sm:    '0.875rem',  // text-sm   — body small, labels
      base:  '1rem',      // text-base — default body
      lg:    '1.125rem',  // text-lg   — body large
      xl:    '1.25rem',   // text-xl   — h4
      '2xl': '1.5rem',    // text-2xl  — h3
      '3xl': '1.875rem',  // text-3xl  — h2
      '4xl': '2.25rem',   // text-4xl  — h1
    },
    weight: {
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },
    lineHeight: {
      tight:   '1.25',   // headings
      snug:    '1.375',  // subheadings
      normal:  '1.5',    // body
      relaxed: '1.625',  // long-form prose
    },
  },

  radius: {
    sm:   'calc(var(--radius) - 4px)', // 8px
    md:   'calc(var(--radius) - 2px)', // 10px
    lg:   'var(--radius)',             // 12px
    full: '9999px',
  },
} as const

export type ColorToken = keyof typeof tokens.colors
