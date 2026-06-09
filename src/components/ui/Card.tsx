import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export const Card = ({ children, className, hoverable = false, ...rest }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-card',
        hoverable && 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const CardHeader = ({ title, subtitle, action, className }: CardHeaderProps) => {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
};

export const CardBody = ({ children, className }: { children: ReactNode; className?: string }) => {
  return <div className={cn('p-5', className)}>{children}</div>;
};
