import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
  value: number;
  label: string;
  tone?: 'accent' | 'warning' | 'danger';
  className?: string;
}

const toneClasses = {
  accent: 'bg-accent',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const;

export const ProgressBar = ({ value, label, tone = 'accent', className }: ProgressBarProps) => {
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <div
      className={cn('bg-surface-muted h-1.5 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-200', toneClasses[tone])}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
};
