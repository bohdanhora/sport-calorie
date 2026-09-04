'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { addDays, isFuture, todayIn } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';

interface DateNavProps {
  date: string;
  timezone: string;
  onChange: (date: string) => void;
}

export const DateNav = ({ date, timezone, onChange }: DateNavProps) => {
  const t = useTranslations('day');
  const today = todayIn(timezone);
  const nextDate = addDays(date, 1);

  return (
    <div className="flex items-center gap-1">
      {date !== today ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(today)}>
          {t('today')}
        </Button>
      ) : null}

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
