'use client';

import { cn } from '@/lib/utils/cn';

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
}

export const Segmented = <T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedProps<T>) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={cn(
      'border-border bg-surface-muted inline-flex w-full gap-0.5 rounded-md border p-0.5',
      className,
    )}
  >
    {options.map((option) => {
      const selected = option.value === value;

      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-[0.3rem] px-3 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150',
            selected
              ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
              : 'text-foreground-muted hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
