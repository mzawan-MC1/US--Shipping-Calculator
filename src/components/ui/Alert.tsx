import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  children,
  ...props
}) => {
  const icons = {
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  const styles = {
    info: 'bg-blue-50/90 border-blue-200 text-blue-900',
    success: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50/90 border-amber-200 text-amber-900',
    error: 'bg-rose-50/90 border-rose-200 text-rose-900',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm',
        styles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-bold text-sm mb-1">{title}</h5>}
        <div className="text-xs md:text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
