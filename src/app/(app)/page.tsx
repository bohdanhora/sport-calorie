'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Suspense, useState } from 'react';

import { ActivityDialog } from '@/components/activity/activity-dialog';
import { FoodEntryDialog } from '@/components/food/food-entry-dialog';
import { Column, Columns } from '@/components/layout/columns';
import { DateHeading, DateNav } from '@/components/layout/date-nav';
import { ErrorState } from '@/components/states/error-state';
import { ActivityList } from '@/components/today/activity-list';
import { CalorieSummary } from '@/components/today/calorie-summary';
import { MacroSummary } from '@/components/today/macro-summary';
import { MealList } from '@/components/today/meal-list';
import { QuickAdd, type QuickAction } from '@/components/today/quick-add';
import { WalkingSummary } from '@/components/today/walking-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { WeightDialog } from '@/components/weight/weight-dialog';
import { useSelectedDate } from '@/hooks/use-selected-date';
import { summaryApi } from '@/lib/api/endpoints';
import type { ActivityCategory, MealType } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

const TodaySkeleton = () => (
  <div className="space-y-6" aria-busy="true">
    <Skeleton className="h-12 w-40" />
    <Skeleton className="h-52 w-full" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);

const TodayView = () => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const errors = useTranslations('errors');
  const common = useTranslations('common');
  const { timezone } = useAuth();
  const format = useFormat();
  const [date, setDate] = useSelectedDate(timezone);
  const [foodDialog, setFoodDialog] = useState<{ open: boolean; meal: MealType }>({
    open: false,
    meal: 'BREAKFAST',
  });
  const [activityDialog, setActivityDialog] = useState<{
    open: boolean;
    category?: ActivityCategory;
  }>({ open: false });
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);

  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(date),
    queryFn: () => summaryApi.dashboard(date),
  });

  const handleQuickAction = (action: QuickAction) => {
    if (action === 'food') {
      setFoodDialog({ open: true, meal: 'BREAKFAST' });
    }

    if (action === 'walk') {
      setActivityDialog({ open: true, category: 'WALKING' });
    }

    if (action === 'workout') {
      setActivityDialog({ open: true, category: 'STRENGTH' });
    }

    if (action === 'weight') {
      setWeightDialogOpen(true);
    }
  };

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-3">
        <DateHeading date={date} timezone={timezone} />
        <DateNav date={date} timezone={timezone} onChange={setDate} />
      </header>

      {dashboard.isPending ? (
        <TodaySkeleton />
      ) : dashboard.isError ? (
        <ErrorState
          title={errors('dayLoadFailed')}
          description={errors('dayLoadFailedHint')}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <Columns>
          <Column>
            <CalorieSummary calories={dashboard.data.calories} />

            <QuickAdd onSelect={handleQuickAction} />

            <MacroSummary
              consumed={dashboard.data.macros.consumed}
              target={dashboard.data.macros.target}
            />

            <WalkingSummary walking={dashboard.data.walking} />
          </Column>

          <Column>
            <MealList
              meals={dashboard.data.meals}
              onAdd={(meal) => setFoodDialog({ open: true, meal })}
            />

            <ActivityList
              activities={dashboard.data.activities}
              onAdd={() => setActivityDialog({ open: true })}
            />

            <section className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div>
                <p className="label-caps">{t('weight')}</p>
                <p className="metric-md mt-1">
                  {dashboard.data.weight ? (
                    <>
                      {format.weight(dashboard.data.weight.weightKg)}
                      <span className="text-foreground-subtle ml-1 text-xs font-normal">
                        {units('kilogram')}
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground-muted text-sm font-normal">
                      {t('weightMissing')}
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWeightDialogOpen(true)}
                className="text-accent press text-[0.8125rem] font-medium underline-offset-4 hover:underline"
              >
                {dashboard.data.weight ? common('update') : common('record')}
              </button>
            </section>

            <p className="text-foreground-subtle text-xs">
              {t('estimateNote')}{' '}
              <Link href="/settings" className="underline underline-offset-2">
                {t('estimateLink')}
              </Link>{' '}
              {t('estimateNoteEnd')}
            </p>
          </Column>
        </Columns>
      )}

      <FoodEntryDialog
        open={foodDialog.open}
        onOpenChange={(open) => setFoodDialog((current) => ({ ...current, open }))}
        date={date}
        defaultMeal={foodDialog.meal}
      />

      <ActivityDialog
        open={activityDialog.open}
        onOpenChange={(open) => setActivityDialog((current) => ({ ...current, open }))}
        date={date}
        preferCategory={activityDialog.category}
      />

      <WeightDialog
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
        date={date}
        currentWeightKg={dashboard.data?.weight?.weightKg ?? null}
      />
    </div>
  );
};

const TodayPage = () => (
  <Suspense fallback={<TodaySkeleton />}>
    <TodayView />
  </Suspense>
);

export default TodayPage;
