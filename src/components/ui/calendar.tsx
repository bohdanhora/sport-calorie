'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import {
  addMonths,
  buildMonthGrid,
  formatDayOfMonth,
  formatFullDate,
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
  /** Inclusive bounds; days outside them are shown but cannot be chosen. */
  min: string;
  max: string;
  /** Marked with a dot when it is not the chosen day. Omit where it is not useful. */
  today?: string;
}

const clampToRange = (date: string, min: string, max: string): string =>
  date < min ? min : date > max ? max : date;

export const Calendar = ({ value, onSelect, min, max, today }: CalendarProps) => {
  const t = useTranslations('day');
  const locale = useLocale();
  const [month, setMonth] = useState(() => startOfMonth(clampToRange(value || max, min, max)));

  const weekStartsOn = weekStartsOnFor(locale);
  const days = buildMonthGrid(month, weekStartsOn);
  const weekdays = days.slice(0, 7);

  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long' }).format(
      new Date(Date.UTC(2000, index, 1)),
    ),
  );

  const firstYear = Number(min.slice(0, 4));
  const lastYear = Number(max.slice(0, 4));
  // Newest first: a birth year is reached faster going back than forward.
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index);

  const selectedYear = Number(month.slice(0, 4));
  const selectedMonth = Number(month.slice(5, 7)) - 1;
  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  const setMonthWithin = (next: string) => setMonth(startOfMonth(clampToRange(next, min, max)));

  return (
    <div className="w-[18.5rem]">
      <div className="flex items-center gap-1.5 pb-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('previousMonth')}
          disabled={min >= month}
          onClick={() => setMonthWithin(previousMonth)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>

        <NativeSelect
          aria-label={t('month')}
          className="h-9 flex-1 px-2 text-[0.8125rem]"
          value={selectedMonth}
          onChange={(event) =>
            setMonthWithin(`${month.slice(0, 4)}-${String(Number(event.target.value) + 1).padStart(2, '0')}-01`)
          }
        >
          {monthNames.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label={t('year')}
          className="numeric h-9 w-[5.25rem] shrink-0 px-2 text-[0.8125rem]"
          value={selectedYear}
          onChange={(event) => setMonthWithin(`${event.target.value}-${month.slice(5, 7)}-01`)}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </NativeSelect>

        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nextMonth')}
          disabled={max < nextMonth}
          onClick={() => setMonthWithin(nextMonth)}
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
          const disabled = day < min || day > max;
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
                'disabled:pointer-events-none disabled:opacity-25',
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
