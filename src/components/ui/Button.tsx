import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'whatsapp' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      startIcon,
      endIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-brand-orange-500 hover:bg-brand-orange-600 text-white shadow-orange-glow focus-visible:ring-brand-orange-500 border border-transparent',
      whatsapp:
        'bg-brand-whatsapp hover:bg-green-600 text-white shadow-whatsapp-glow focus-visible:ring-brand-whatsapp border border-transparent',
      secondary:
        'bg-brand-navy-900 hover:bg-brand-navy-800 text-white shadow-sm focus-visible:ring-brand-navy-700 border border-brand-navy-800',
      outline:
        'border-2 border-slate-300 hover:border-brand-navy-900 bg-white hover:bg-slate-50 text-brand-navy-900 focus-visible:ring-brand-navy-700',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-brand-navy-900 focus-visible:ring-slate-400',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-500',
    };

    const sizes = {
      sm: 'text-xs px-3 py-2 rounded-lg gap-1.5 min-h-[36px]',
      md: 'text-sm px-4 py-2.5 rounded-xl gap-2 min-h-[44px]',
      lg: 'text-base px-6 py-3.5 rounded-xl gap-2.5 min-h-[50px] font-extrabold tracking-wide',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && startIcon && <span className="shrink-0">{startIcon}</span>}
        <span>{children}</span>
        {!isLoading && endIcon && <span className="shrink-0">{endIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
