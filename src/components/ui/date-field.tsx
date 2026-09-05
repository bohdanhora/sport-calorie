'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

interface DateFieldProps {
  value: string;
  onChange: (date: string) => void;
  min: string;
  max: string;
  today?: string;
  placeholder?: string;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
}

/**
 * Replaces `input type="date"`. The native control opens the browser's own
 * calendar, which follows neither the app's theme nor its language and, on a
 * date of birth, pages a month at a time from today.
 */
export const DateField = ({
  value,
  onChange,
  min,
  max,
  today,
  placeholder,
  className,
  ...aria
}: DateFieldProps) => {
  const t = useTranslations('day');
  const format = useFormat();
  const [open, setOpen] = useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        type="button"
        {...aria}
        className={cn(
          'border-border-strong bg-surface text-foreground focus-visible:border-accent focus-visible:outline-ring flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1',
          'aria-[invalid=true]:border-danger',
          className,
        )}
      >
        <span className={cn('numeric truncate', !value && 'text-foreground-subtle')}>
          {value ? format.dateWithYear(value) : (placeholder ?? t('pickDate'))}
        </span>
        <CalendarDays className="text-foreground-subtle size-4 shrink-0" aria-hidden />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="border-border bg-surface-raised shadow-soft z-[60] animate-[fade-in_140ms_ease-out] rounded-lg border p-3"
        >
          <Calendar
            value={value}
            min={min}
            max={max}
            today={today}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
