'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProgressAverages } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

interface PeriodStatsProps {
  current: ProgressAverages;
  previous?: ProgressAverages;
  rangeDays: number;
}

/** Below this the two periods are the same number wearing a different hat. */
const NOISE_FLOOR = 0.005;

const Delta = ({
  current,
  previous,
  format: formatValue,
}: {
  current: number;
  previous: number | undefined;
  format: (value: number) => string;
}) => {
  const t = useTranslations('progress');

  if (previous === undefined || previous === 0) {
    return null;
  }

  const difference = current - previous;
  const flat = Math.abs(difference) / Math.abs(previous) < NOISE_FLOOR;
  const Icon = flat ? Minus : difference > 0 ? ArrowUp : ArrowDown;

  return (
    <p className="text-foreground-subtle mt-1.5 flex items-center gap-1 text-[0.6875rem]">
      <Icon className="size-3 shrink-0" aria-hidden />
      {flat ? null : <span className="numeric">{formatValue(Math.abs(difference))}</span>}
      <span className="truncate">{t('vsPrevious')}</span>
    </p>
  );
};

/**
 * Averages are hard to read alone: 1,500 kcal a day is only meaningful next to
 * what the weeks before it looked like. The arrow says which way it moved; no
 * colour, because eating less is not automatically better.
 */
export const PeriodStats = ({ current, previous, rangeDays }: PeriodStatsProps) => {
  const t = useTranslations('progress');
  const format = useFormat();

  const cards = [
    {
      key: 'consumed',
      value: format.kcal(current.avgConsumedKcal),
      current: current.avgConsumedKcal,
      previous: previous?.avgConsumedKcal,
      format: format.kcal,
    },
    {
      key: 'activity',
      value: format.kcal(current.avgActivityKcal),
      current: current.avgActivityKcal,
      previous: previous?.avgActivityKcal,
      format: format.kcal,
    },
    {
      key: 'balance',
      value: format.signedKcal(current.avgBalanceKcal),
      current: current.avgBalanceKcal,
      previous: previous?.avgBalanceKcal,
      format: format.kcal,
      tone: current.avgBalanceKcal > 0 ? 'text-danger' : 'text-accent',
    },
    {
      key: 'walking',
      value: format.distance(current.avgWalkingDistanceM),
      current: current.avgWalkingDistanceM,
      previous: previous?.avgWalkingDistanceM,
      format: format.distance,
    },
  ] as const;

  return (
    <div className="space-y-2">
      <dl className="border-border bg-surface grid grid-cols-2 rounded-lg border sm:grid-cols-4">
        {cards.map((card, index) => (
          <div
            key={card.key}
            className={cn(
              'border-border px-4 py-3.5',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t sm:border-t-0',
              index === 2 && 'sm:border-l',
              index === 3 && 'sm:border-l',
            )}
          >
            <dt className="label-caps">{t(card.key)}</dt>
            <dd>
              <p className={cn('metric-md mt-1.5', 'tone' in card ? card.tone : undefined)}>
                {card.value}
              </p>
              <Delta current={card.current} previous={card.previous} format={card.format} />
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-foreground-subtle text-xs">
        {t('daysLogged', { logged: current.daysLogged, total: rangeDays })}
      </p>
    </div>
  );
};
