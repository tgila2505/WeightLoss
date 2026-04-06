import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'lead' | 'muted' | 'label'
type As = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'label' | 'div'

const variantClasses: Record<Variant, string> = {
  h1:    'scroll-m-20 text-4xl font-bold tracking-tight leading-tight',
  h2:    'scroll-m-20 text-3xl font-semibold tracking-tight leading-tight',
  h3:    'scroll-m-20 text-2xl font-semibold tracking-tight leading-snug',
  h4:    'scroll-m-20 text-xl font-semibold leading-snug',
  p:     'text-base leading-normal',
  lead:  'text-lg text-muted-foreground leading-relaxed',
  muted: 'text-sm text-muted-foreground leading-normal',
  label: 'text-sm font-medium leading-none',
}

const defaultTag: Record<Variant, As> = {
  h1:    'h1',
  h2:    'h2',
  h3:    'h3',
  h4:    'h4',
  p:     'p',
  lead:  'p',
  muted: 'p',
  label: 'span',
}

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: Variant
  as?: As
}

function Typography({ variant = 'p', as, className, ...props }: TypographyProps) {
  const Tag = as ?? defaultTag[variant]
  return (
    <Tag
      className={cn(variantClasses[variant], className)}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    />
  )
}

Typography.displayName = 'Typography'

export { Typography }
export type { TypographyProps }
