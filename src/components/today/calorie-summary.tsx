'use client';

import { useTranslations } from 'next-intl';

import { useAnimatedNumber } from '@/hooks/use-animated-number';
import type { CalorieSummary as CalorieSummaryData } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

interface CalorieSummaryProps {
  calories: CalorieSummaryData;
}

export const CalorieSummary = ({ calories }: CalorieSummaryProps) => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  const isOver = calories.remainingKcal < 0;
  const allowance = Math.max(calories.targetKcal + calories.activityKcal, 1);
  const consumedShare = Math.min(calories.consumedKcal / allowance, 1);
  const targetShare = Math.min(calories.targetKcal / allowance, 1);
  const showTargetTick = calories.activityKcal > 0 && targetShare < 1;

  const headline = useAnimatedNumber(Math.abs(calories.remainingKcal));

  const values = [
    { key: 'consumed', value: calories.consumedKcal },
    { key: 'goal', value: calories.targetKcal },
    { key: 'activity', value: calories.activityKcal },
  ] as const;

  return (
    <section
      aria-labelledby="calorie-heading"
      className="border-border bg-surface rounded-lg border px-5 py-6 sm:px-6"
    >
      <h2 id="calorie-heading" className="label-caps">
        {isOver ? t('overGoal') : t('remaining')}
      </h2>

      <p className="mt-2 flex items-baseline gap-2">
        <span className={cn('metric-xl', isOver ? 'text-danger' : 'text-foreground')}>
          {format.kcal(headline)}
        </span>
        <span className="text-foreground-subtle text-sm font-medium">{units('kcal')}</span>
      </p>

      <div
        className="bg-surface-muted relative mt-5 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label={t('progressLabel')}
        aria-valuenow={Math.round(consumedShare * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            isOver ? 'bg-danger' : 'bg-accent',
          )}
          style={{ width: `${consumedShare * 100}%` }}
        />
        {showTargetTick ? (
          <span
            aria-hidden
            className="bg-surface absolute inset-y-0 w-0.5"
            style={{ left: `${targetShare * 100}%` }}
          />
        ) : null}
      </div>

      <dl className="border-border mt-5 grid grid-cols-3 gap-4 border-t pt-4">
        {values.map(({ key, value }) => (
          <div key={key}>
            <dt className="label-caps">{t(key)}</dt>
            <dd className="metric-md mt-1.5">{format.kcal(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
