'use client';

import { useTranslations } from 'next-intl';

import { useAnimatedNumber } from '@/hooks/use-animated-number';
import type { CalorieSummary as CalorieSummaryData } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

interface CalorieSummaryProps {
  calories: CalorieSummaryData;
}

const RING_SIZE = 168;
const RING_STROKE = 13;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export const CalorieSummary = ({ calories }: CalorieSummaryProps) => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  const isOver = calories.remainingKcal < 0;
  // Activity earns extra room to eat, so the ring is read against the whole allowance.
  const allowance = Math.max(calories.targetKcal + calories.activityKcal, 1);
  const consumedShare = Math.min(calories.consumedKcal / allowance, 1);
  const targetShare = Math.min(calories.targetKcal / allowance, 1);
  const showTargetTick = calories.activityKcal > 0 && targetShare < 1;

  const headline = useAnimatedNumber(Math.abs(calories.remainingKcal));

  const values = [
    { key: 'consumed', value: calories.consumedKcal, tone: 'bg-accent' },
    { key: 'goal', value: calories.targetKcal, tone: 'bg-border-strong' },
    { key: 'activity', value: calories.activityKcal, tone: 'bg-chart-3' },
  ] as const;

  return (
    <section
      aria-labelledby="calorie-heading"
      className="border-border bg-surface rounded-lg border px-5 py-6 sm:px-6"
    >
      <h2 id="calorie-heading" className="sr-only">
        {isOver ? t('overGoal') : t('remaining')}
      </h2>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <div
          className="relative shrink-0"
          role="progressbar"
          aria-label={t('progressLabel')}
          aria-valuenow={Math.round(consumedShare * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <svg
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="size-full -rotate-90"
            aria-hidden
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="var(--surface-muted)"
              strokeWidth={RING_STROKE}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={isOver ? 'var(--danger)' : 'var(--accent)'}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - consumedShare)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
            {showTargetTick ? (
              /* Where the goal alone would have ended, before activity widened it. */
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--surface)"
                strokeWidth={RING_STROKE}
                strokeDasharray={`3 ${RING_LENGTH}`}
                strokeDashoffset={-RING_LENGTH * targetShare}
              />
            ) : null}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="label-caps">{isOver ? t('overGoal') : t('remaining')}</p>
            <p
              className={cn(
                'metric-lg mt-1 text-[2.125rem] leading-none',
                isOver ? 'text-danger' : 'text-foreground',
              )}
            >
              {format.kcal(headline)}
            </p>
            <p className="text-foreground-subtle mt-1 text-xs">{units('kcal')}</p>
          </div>
        </div>

        <dl className="w-full space-y-3.5">
          {values.map(({ key, value, tone }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <dt className="text-foreground-muted flex items-center gap-2 text-[0.8125rem]">
                <span className={cn('size-2 rounded-full', tone)} aria-hidden />
                {t(key)}
              </dt>
              <dd className="metric-md">{format.kcal(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
