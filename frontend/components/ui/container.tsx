import * as React from 'react'
import { cn } from '@/lib/utils'

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize
}

const sizeClasses: Record<ContainerSize, string> = {
  sm:   'max-w-2xl',
  md:   'max-w-4xl',
  lg:   'max-w-5xl',
  xl:   'max-w-7xl',
  full: 'max-w-full',
}

function Container({ size = 'lg', className, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-4', sizeClasses[size], className)}
      {...props}
    />
  )
}

Container.displayName = 'Container'

export { Container }
export type { ContainerProps }
