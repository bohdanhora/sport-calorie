import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: 'default' | 'accent' | 'danger' | 'muted';
  align?: 'left' | 'right';
  className?: string;
}

const toneClasses: Record<NonNullable<StatProps['tone']>, string> = {
  default: 'text-foreground',
  accent: 'text-accent',
  danger: 'text-danger',
  muted: 'text-foreground-muted',
};

export const Stat = ({
  label,
  value,
  unit,
  tone = 'default',
  align = 'left',
  className,
}: StatProps) => (
  <div className={cn(align === 'right' && 'text-right', className)}>
    <p className="label-caps">{label}</p>
    <p className={cn('metric-lg mt-1', toneClasses[tone])}>
      {value}
      {unit ? (
        <span className="text-foreground-subtle ml-1 text-xs font-medium">{unit}</span>
      ) : null}
    </p>
  </div>
);
