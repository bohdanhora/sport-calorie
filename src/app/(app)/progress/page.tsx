'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DailyAreaChart, DailyBarChart } from '@/components/charts/daily-chart';
import { Columns } from '@/components/layout/columns';
import { ActivityBreakdown } from '@/components/progress/activity-breakdown';
import { PeriodStats } from '@/components/progress/period-stats';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { summaryApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/auth-provider';
import { addDays, todayIn } from '@/lib/format/dates';
import { metresToKilometres } from '@/lib/format/units';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

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
  const { timezone } = useAuth();
  const format = useFormat();
  const [range, setRange] = useState<RangeValue>('30');

  const rangeDays = Number(range);
  const to = todayIn(timezone);
  const from = addDays(to, -(rangeDays - 1));

  const progress = useQuery({
    queryKey: queryKeys.progress(from, to),
    queryFn: () => summaryApi.progress(from, to),
  });

  // The window of the same length ending the day before, to say which way the
  // averages moved rather than leaving them without a reference.
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(rangeDays - 1));
  const previous = useQuery({
    queryKey: queryKeys.progress(previousFrom, previousTo),
    queryFn: () => summaryApi.progress(previousFrom, previousTo),
  });

  const rangeOptions = RANGES.map(({ value, key }) => ({ value, label: t(key) }));

  return (
    <div className="space-y-7">
      <header className="space-y-4">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
        </div>
        <Segmented
          label={t('range')}
          value={range}
          onChange={setRange}
          options={rangeOptions}
          className="sm:max-w-md"
        />
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
            <PeriodStats
              current={progress.data.averages}
              previous={
                previous.data && previous.data.averages.daysLogged > 0
                  ? previous.data.averages
                  : undefined
              }
              rangeDays={rangeDays}
            />
          </Section>

          <Columns>
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
                  color="var(--chart-3)"
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
                  color="var(--chart-2)"
                  formatValue={(value) => `${format.decimal(value)} ${units('kilometre')}`}
                  formatAxisValue={format.decimal}
                  formatDate={format.shortDate}
                />
              </ChartPanel>
            </Section>

            {progress.data.weights.length >= 2 ? (
              <Section title={t('weight')}>
                <ChartPanel>
                  <DailyAreaChart
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
              <Section title={t('breakdown')} className="xl:col-span-2">
                <ActivityBreakdown activities={progress.data.activityBreakdown} />
              </Section>
            ) : null}
          </Columns>
        </>
      )}
    </div>
  );
};

export default ProgressPage;
