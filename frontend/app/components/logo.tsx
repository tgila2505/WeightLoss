import { TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LogoMark({ size = 'sm', className }: LogoMarkProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md',
        size === 'lg' && 'w-16 h-16 rounded-2xl',
        size === 'md' && 'w-12 h-12 rounded-xl',
        size === 'sm' && 'w-8 h-8 rounded-lg',
        className,
      )}
    >
      <TrendingDown
        className={cn(
          'text-white',
          size === 'lg' && 'h-8 w-8',
          size === 'md' && 'h-6 w-6',
          size === 'sm' && 'h-4 w-4',
        )}
        strokeWidth={2.5}
      />
    </div>
  );
}

interface LogoTextProps {
  size?: 'sm' | 'lg';
  as?: 'span' | 'h1';
}

export function LogoText({ size = 'sm', as: Tag = 'span' }: LogoTextProps) {
  return (
    <Tag
      className={cn(
        'font-bold text-slate-900',
        size === 'lg' ? 'text-2xl' : 'text-sm font-semibold',
      )}
    >
      Weight<span className="text-blue-600">Loss</span>
    </Tag>
  );
}
