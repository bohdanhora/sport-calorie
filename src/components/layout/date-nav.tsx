'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { addDays, addMonths, isFuture, todayIn } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';

/** How far back the picker offers to go; the app has no data older than this. */
const HISTORY_MONTHS = 60;

interface DateNavProps {
  date: string;
  timezone: string;
  onChange: (date: string) => void;
}

export const DateNav = ({ date, timezone, onChange }: DateNavProps) => {
  const t = useTranslations('day');
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = todayIn(timezone);
  const nextDate = addDays(date, 1);

  return (
    <div className="flex items-center gap-1">
      {date !== today ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(today)}>
          {t('today')}
        </Button>
      ) : null}

      <PopoverPrimitive.Root open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('pickDate')}>
            <CalendarDays className="size-4" aria-hidden />
          </Button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={8}
            className="border-border bg-surface-raised shadow-soft z-50 animate-[fade-in_140ms_ease-out] rounded-lg border p-3"
          >
            <Calendar
              value={date}
              min={addMonths(today, -HISTORY_MONTHS)}
              max={today}
              today={today}
              onSelect={(next) => {
                onChange(next);
                setPickerOpen(false);
              }}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <Button
        variant="ghost"
        size="icon"
        aria-label={t('previous')}
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label={t('next')}
        disabled={isFuture(nextDate, timezone)}
        onClick={() => onChange(nextDate)}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
};

export const DateHeading = ({ date, timezone }: { date: string; timezone: string }) => {
  const format = useFormat();

  return (
    <div>
      <h1 className="page-title">{format.dayLabel(date, timezone)}</h1>
      <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{format.fullDate(date)}</p>
    </div>
  );
};
