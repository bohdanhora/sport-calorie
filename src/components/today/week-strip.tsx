'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Section } from '@/components/ui/section';
import type { DayOverview } from '@/lib/api/types';
import { formatWeekdayDate } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

interface WeekStripProps {
  days: DayOverview[];
  selected: string;
  onSelect: (date: string) => void;
  /** Intake is read against the goal; energy burned has no goal to read against. */
  metric?: 'intake' | 'burned';
}

/** Headroom above the tallest bar, so a day over the goal still has the line below it. */
const SCALE_HEADROOM = 1.15;

/**
 * The week behind the day on screen: one bar per day against the goal line, so
 * "is today unusual?" is answered here instead of on Progress. Bars alone would
 * say little - intake rarely swings much - which is what the line is for.
 */
export const WeekStrip = ({ days, selected, onSelect, metric = 'intake' }: WeekStripProps) => {
  const t = useTranslations('today');
  const locale = useLocale();
  const format = useFormat();

  if (days.length === 0) {
    return null;
  }

  const intake = metric === 'intake';
  const valueOf = (day: DayOverview) => (intake ? day.consumedKcal : day.activityKcal);
  const targets = intake ? days.map((day) => day.targetKcal).filter((target) => target > 0) : [];
  const goal = targets.length > 0 ? targets.reduce((sum, x) => sum + x, 0) / targets.length : 0;
  const peak = Math.max(...days.map(valueOf), goal, 1) * SCALE_HEADROOM;

  return (
    <Section title={t('lastDays')}>
      <div className="border-border bg-surface rounded-lg border px-4 pt-4 pb-3">
        <div className="relative h-28">
          {goal > 0 ? (
            <div
              aria-hidden
              className="border-border-strong absolute inset-x-0 border-t border-dashed"
              style={{ bottom: `${(goal / peak) * 100}%` }}
            >
              <span className="text-foreground-subtle absolute -top-4 right-0 text-[0.625rem]">
                {t('goal')}
              </span>
            </div>
          ) : null}

          <ol className="flex h-full items-end justify-between gap-2">
            {days.map((day) => {
              const isSelected = day.date === selected;
              const value = valueOf(day);
              const isOver = intake && day.targetKcal > 0 && value > day.targetKcal;
              const logged = value > 0;

              return (
                <li key={day.date} className="flex h-full min-w-0 flex-1 items-end justify-center">
                  <button
                    type="button"
                    onClick={() => onSelect(day.date)}
                    title={`${formatWeekdayDate(day.date, locale)} · ${format.kcal(value)}`}
                    aria-current={isSelected ? 'date' : undefined}
                    className="press focus-visible:outline-ring flex h-full w-full max-w-8 items-end justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span
                      className={cn(
                        'w-full rounded-t-sm transition-[height] duration-500 ease-out',
                        !logged && 'bg-surface-muted',
                        logged && (isOver ? 'bg-danger/60' : 'bg-accent/55'),
                        logged && isSelected && (isOver ? 'bg-danger' : 'bg-accent'),
                      )}
                      style={{ height: logged ? `${(value / peak) * 100}%` : '3px' }}
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <ol className="mt-2 flex justify-between gap-2" aria-hidden>
          {days.map((day) => (
            <li
              key={day.date}
              className={cn(
                'min-w-0 flex-1 text-center text-[0.6875rem]',
                day.date === selected ? 'text-foreground font-medium' : 'text-foreground-subtle',
              )}
            >
              {formatWeekdayDate(day.date, locale).slice(0, 2)}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
};
