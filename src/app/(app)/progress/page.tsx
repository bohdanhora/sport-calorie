'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DailyBarChart, DailyLineChart } from '@/components/charts/daily-chart';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { summaryApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/auth-provider';
import { addDays, todayIn } from '@/lib/format/dates';
import { metresToKilometres } from '@/lib/format/units';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { cn } from '@/lib/utils/cn';

const RANGES = [
  { value: '7', key: 'days7' },
  { value: '30', key: 'days30' },
  { value: '90', key: 'months3' },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

const ChartPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="border-border bg-surface rounded-lg border py-4 pr-4 pl-2">{children}</div>
);

const ProgressPage = () => {
  const t = useTranslations('progress');
  const units = useTranslations('units');
  const today = useTranslations('today');
  const { timezone } = useAuth();
  const format = useFormat();
  const activityName = useActivityTypeName();
  const [range, setRange] = useState<RangeValue>('30');

  const to = todayIn(timezone);
  const from = addDays(to, -(Number(range) - 1));

  const progress = useQuery({
    queryKey: queryKeys.progress(from, to),
    queryFn: () => summaryApi.progress(from, to),
  });

  const rangeOptions = RANGES.map(({ value, key }) => ({ value, label: t(key) }));

  return (
    <div className="space-y-7">
      <header className="space-y-4">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
        </div>
        <Segmented label={t('range')} value={range} onChange={setRange} options={rangeOptions} />
      </header>

      {progress.isPending ? (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : progress.isError ? (
        <ErrorState onRetry={() => void progress.refetch()} />
      ) : progress.data.averages.daysLogged === 0 ? (
        <EmptyState title={t('nothingYet')} description={t('nothingYetHint')} />
      ) : (
        <>
          <Section title={t('averages')}>
            <dl className="border-border bg-surface grid grid-cols-2 gap-x-4 gap-y-4 rounded-lg border px-4 py-4 sm:grid-cols-4">
              <div>
                <dt className="label-caps">{t('consumed')}</dt>
                <dd className="metric-md mt-1.5">
                  {format.kcal(progress.data.averages.avgConsumedKcal)}
                </dd>
              </div>
              <div>
                <dt className="label-caps">{t('activity')}</dt>
                <dd className="metric-md mt-1.5">
                  {format.kcal(progress.data.averages.avgActivityKcal)}
                </dd>
              </div>
              <div>
                <dt className="label-caps">{t('balance')}</dt>
                <dd
                  className={cn(
                    'metric-md mt-1.5',
                    progress.data.averages.avgBalanceKcal > 0 ? 'text-danger' : 'text-accent',
                  )}
                >
                  {format.signedKcal(progress.data.averages.avgBalanceKcal)}
                </dd>
              </div>
              <div>
                <dt className="label-caps">{t('walking')}</dt>
                <dd className="metric-md mt-1.5">
                  {format.distance(progress.data.averages.avgWalkingDistanceM)}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title={t('caloriesConsumed')}>
            <ChartPanel>
              <DailyBarChart
                data={progress.data.days.map((day) => ({
                  date: day.date,
                  value: day.consumedKcal,
                }))}
                seriesName={t('consumed')}
                formatValue={format.kcal}
                formatAxisValue={format.axisKcal}
                formatDate={format.shortDate}
                referenceValue={progress.data.days.at(-1)?.targetKcal}
              />
            </ChartPanel>
            <p className="text-foreground-subtle text-xs">{t('goalLineNote')}</p>
          </Section>

          <Section title={t('activityCalories')}>
            <ChartPanel>
              <DailyBarChart
                data={progress.data.days.map((day) => ({
                  date: day.date,
                  value: day.activityKcal,
                }))}
                seriesName={t('burned')}
                formatValue={format.kcal}
                formatAxisValue={format.axisKcal}
                formatDate={format.shortDate}
              />
            </ChartPanel>
          </Section>

          <Section title={t('walkingDistance')}>
            <ChartPanel>
              <DailyBarChart
                data={progress.data.days.map((day) => ({
                  date: day.date,
                  value: metresToKilometres(day.walkingDistanceM),
                }))}
                seriesName={t('distance')}
                formatValue={(value) => `${format.decimal(value)} ${units('kilometre')}`}
                formatAxisValue={format.decimal}
                formatDate={format.shortDate}
              />
            </ChartPanel>
          </Section>

          {progress.data.weights.length >= 2 ? (
            <Section title={t('weight')}>
              <ChartPanel>
                <DailyLineChart
                  data={progress.data.weights.map((point) => ({
                    date: point.date,
                    value: point.weightKg,
                  }))}
                  seriesName={t('weight')}
                  formatValue={format.weight}
                  formatDate={format.shortDate}
                />
              </ChartPanel>
            </Section>
          ) : null}

          {progress.data.activityBreakdown.length > 0 ? (
            <Section title={t('breakdown')}>
              <ul className="divide-border border-border bg-surface divide-y overflow-hidden rounded-lg border">
                {progress.data.activityBreakdown.map((activity, index) => (
                  <li
                    key={activity.activityTypeId}
                    className="animate-row flex items-center justify-between gap-3 px-4 py-3"
                    style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
                  >
                    <div>
                      <p className="text-sm">{activityName(activity)}</p>
                      <p className="numeric text-foreground-subtle mt-0.5 text-xs">
                        {today('sessions', { count: activity.sessions })}
                        {activity.durationSec > 0
                          ? ` · ${format.duration(activity.durationSec)}`
                          : ''}
                      </p>
                    </div>
                    <p className="numeric text-sm">
                      {format.kcal(activity.energyKcal)} {units('kcal')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
};

export default ProgressPage;
