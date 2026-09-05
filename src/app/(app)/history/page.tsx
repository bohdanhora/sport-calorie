'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { summaryApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/auth-provider';
import { addDays, todayIn } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

const RANGES = [
  { value: '14', key: 'weeks2' },
  { value: '30', key: 'days30' },
  { value: '90', key: 'months3' },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

const HistoryPage = () => {
  const t = useTranslations('history');
  const units = useTranslations('units');
  const progress = useTranslations('progress');
  const { timezone } = useAuth();
  const format = useFormat();
  const [range, setRange] = useState<RangeValue>('14');

  const to = todayIn(timezone);
  const from = addDays(to, -(Number(range) - 1));

  const history = useQuery({
    queryKey: queryKeys.history(from, to),
    queryFn: () => summaryApi.history(from, to),
  });

  const days = [...(history.data ?? [])].reverse();
  const loggedDays = days.filter(
    (day) => day.foodEntryCount > 0 || day.activityCount > 0 || day.weightKg !== null,
  );

  const rangeOptions = RANGES.map(({ value, key }) => ({ value, label: t(key) }));

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
        </div>
        <Segmented
          label={progress('range')}
          value={range}
          onChange={setRange}
          options={rangeOptions}
          className="sm:max-w-md"
        />
      </header>

      {history.isPending ? (
        <div className="space-y-2 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : history.isError ? (
        <ErrorState onRetry={() => void history.refetch()} />
      ) : loggedDays.length === 0 ? (
        <EmptyState title={t('empty')} description={t('emptyHint')} />
      ) : (
        <ul className="divide-border border-border bg-surface divide-y overflow-hidden rounded-lg border xl:grid xl:grid-cols-2 xl:gap-3 xl:divide-y-0 xl:overflow-visible xl:rounded-none xl:border-0 xl:bg-transparent">
          {loggedDays.map((day, index) => {
            const balance = day.netKcal - day.targetKcal;
            const label = format.dayLabel(day.date, timezone);

            return (
              <li
                key={day.date}
                className="animate-row xl:border-border xl:bg-surface xl:overflow-hidden xl:rounded-lg xl:border"
                style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
              >
                <Link
                  href={{ pathname: '/', query: { date: day.date } }}
                  className="press hover:bg-surface-muted flex items-center gap-4 px-4 py-3"
                >
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium">{label}</p>
                    {format.isRelativeDay(day.date, timezone) ? (
                      <p className="text-foreground-subtle mt-0.5 text-xs">
                        {format.shortDate(day.date)}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="numeric text-sm">
                      {format.kcal(day.consumedKcal)}
                      <span className="text-foreground-subtle"> {t('in')} · </span>
                      {format.kcal(day.activityKcal)}
                      <span className="text-foreground-subtle"> {t('out')}</span>
                    </p>
                    <p className="numeric text-foreground-subtle mt-0.5 text-xs">
                      {day.walkingDistanceM > 0
                        ? format.distance(day.walkingDistanceM)
                        : t('noWalk')}
                      {day.weightKg !== null
                        ? ` · ${format.weight(day.weightKg)} ${units('kilogram')}`
                        : ''}
                    </p>
                  </div>

                  <span
                    className={`numeric shrink-0 text-sm ${
                      balance > 0 ? 'text-danger' : 'text-accent'
                    }`}
                  >
                    {format.signedKcal(balance)}
                  </span>

                  <ChevronRight className="text-foreground-subtle size-4 shrink-0" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HistoryPage;
