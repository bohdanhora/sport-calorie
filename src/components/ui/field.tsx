'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/lib/utils/cn';

interface FieldProps {
  label: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean;
  }) => ReactNode;
  error?: string;
  hint?: string;
  suffix?: string;
  className?: string;
  optional?: boolean;
}

export const Field = ({
  label,
  children,
  error,
  hint,
  suffix,
  className,
  optional = false,
}: FieldProps) => {
  const common = useTranslations('common');
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <LabelPrimitive.Root
          htmlFor={id}
          className="text-foreground-muted text-[0.8125rem] font-medium"
        >
          {label}
        </LabelPrimitive.Root>
        {optional ? (
          <span className="text-foreground-subtle text-xs">{common('optional')}</span>
        ) : null}
      </div>

      <div className="relative">
        {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
        {suffix ? (
          <span className="text-foreground-subtle pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
            {suffix}
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-foreground-subtle text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
