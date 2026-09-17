import React from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  interactive?: boolean;
  compact?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, selected = false, interactive = false, compact = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl bg-white border transition-all duration-200 shadow-sm',
          selected
            ? 'border-brand-orange-500 ring-2 ring-brand-orange-500/20 bg-orange-50/20 shadow-md'
            : 'border-slate-200 hover:border-slate-300',
          interactive && 'cursor-pointer hover:shadow-md active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {selected && (
          <div
            className={cn(
              'absolute rounded-full bg-brand-orange-500 text-white flex items-center justify-center shadow-sm z-10',
              compact
                ? 'top-1.5 end-1.5 w-4 h-4'
                : 'top-2.5 end-2.5 w-5 h-5'
            )}
          >
            <Check className={compact ? 'w-2.5 h-2.5 stroke-[3]' : 'w-3.5 h-3.5 stroke-[3]'} />
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
