'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  addMonths,
  buildMonthGrid,
  formatDayOfMonth,
  formatFullDate,
  formatMonthYear,
  formatWeekdayNarrow,
  isSameMonth,
  startOfMonth,
  weekStartsOnFor,
} from '@/lib/format/dates';
import { cn } from '@/lib/utils/cn';

interface CalendarProps {
  /** The selected day, and the month the grid opens on. */
  value: string;
  onSelect: (date: string) => void;
  /** Today in the user's timezone; days after it cannot be chosen. */
  today: string;
}

export const Calendar = ({ value, onSelect, today }: CalendarProps) => {
  const t = useTranslations('day');
  const locale = useLocale();
  const [month, setMonth] = useState(() => startOfMonth(value));

  const weekStartsOn = weekStartsOnFor(locale);
  const days = buildMonthGrid(month, weekStartsOn);
  const weekdays = days.slice(0, 7);
  const atCurrentMonth = isSameMonth(month, today);

  return (
    <div className="w-[17.5rem]">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('previousMonth')}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>

        <p aria-live="polite" className="text-[0.8125rem] font-medium">
          {formatMonthYear(month, locale)}
        </p>

        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nextMonth')}
          disabled={atCurrentMonth}
          onClick={() => setMonth(addMonths(month, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5" role="grid">
        {weekdays.map((day) => (
          <div
            key={`head-${day}`}
            role="columnheader"
            className="text-foreground-subtle pb-1 text-center text-[0.6875rem] font-medium uppercase"
          >
            {formatWeekdayNarrow(day, locale)}
          </div>
        ))}

        {days.map((day) => {
          const outside = !isSameMonth(day, month);
          const disabled = day > today;
          const selected = day === value;
          const isToday = day === today;

          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-current={isToday ? 'date' : undefined}
              aria-selected={selected}
              aria-label={formatFullDate(day, locale)}
              onClick={() => onSelect(day)}
              className={cn(
                'numeric focus-visible:outline-ring relative flex h-9 items-center justify-center rounded-md text-[0.8125rem] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1',
                'disabled:pointer-events-none disabled:opacity-30',
                outside && 'text-foreground-subtle',
                !outside && !selected && 'text-foreground hover:bg-surface-muted',
                selected && 'bg-accent text-accent-foreground font-medium',
              )}
            >
              {formatDayOfMonth(day, locale)}
              {isToday && !selected ? (
                <span className="bg-accent absolute bottom-1 size-1 rounded-full" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
