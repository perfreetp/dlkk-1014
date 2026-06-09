import type { ReactNode } from 'react';
import { cn } from '@/utils/helpers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  gradient?: string;
  className?: string;
}

export const StatCard = ({ title, value, subtitle, icon, trend, gradient, className }: StatCardProps) => {
  const defaultGradient = 'from-primary-50 to-white via-white';
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/80 p-5 shadow-card',
        'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        gradient || `bg-gradient-to-br ${defaultGradient}`,
        className
      )}
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 bg-current" />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 text-3xl font-bold text-slate-900 tracking-tight font-serif">
            {value}
          </div>
          {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className="shrink-0 ml-4 w-11 h-11 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="relative mt-4 flex items-center gap-1.5 text-xs">
          {trend.value > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-success-600" />
          ) : trend.value < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-danger-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span
            className={cn(
              'font-medium',
              trend.value > 0
                ? 'text-success-700'
                : trend.value < 0
                ? 'text-danger-500'
                : 'text-slate-500'
            )}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value}%
          </span>
          {trend.label && <span className="text-slate-400">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};
