'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

import { ActivityDialog, type ActivityDialogTarget } from '@/components/activity/activity-dialog';
import { ExercisesSection, WorkoutsSection } from '@/components/activity/exercise-library';
import { WorkoutDialog } from '@/components/activity/workout-dialog';
import { Column, Columns } from '@/components/layout/columns';
import { DateHeading, DateNav } from '@/components/layout/date-nav';
import { ErrorState } from '@/components/states/error-state';
import { ActivityList } from '@/components/today/activity-list';
import { WalkingSummary } from '@/components/today/walking-summary';
import { WeekStrip } from '@/components/today/week-strip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelectedDate } from '@/hooks/use-selected-date';
import { summaryApi } from '@/lib/api/endpoints';
import type { ActivityCategory, Workout } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { addDays } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

const ActivityView = () => {
  const t = useTranslations('activityPage');
  const units = useTranslations('units');
  const { timezone } = useAuth();
  const format = useFormat();
  const [date, setDate] = useSelectedDate(timezone);
  const [dialog, setDialog] = useState<{
    open: boolean;
    category?: ActivityCategory;
    target?: ActivityDialogTarget;
  }>({ open: false });
  const [workoutDialog, setWorkoutDialog] = useState<{ open: boolean; workout?: Workout }>({
    open: false,
  });

  const openExercise = (target: ActivityDialogTarget): void =>
    setDialog({ open: true, category: 'STRENGTH', target });

  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(date),
    queryFn: () => summaryApi.dashboard(date),
  });

  const weekFrom = addDays(date, -6);
  const week = useQuery({
    queryKey: queryKeys.history(weekFrom, date),
    queryFn: () => summaryApi.history(weekFrom, date),
  });

  const walkingSessions =
    dashboard.data?.activities.filter((entry) => entry.activityType.category === 'WALKING') ?? [];
  const otherSessions =
    dashboard.data?.activities.filter((entry) => entry.activityType.category !== 'WALKING') ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="page-title truncate">{t('title')}</h1>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setDialog({ open: true, target: { kind: 'log' } })}
            >
              <Plus className="size-4" aria-hidden />
              {t('logActivity')}
            </Button>
          </div>
          <p className="text-foreground-subtle text-[0.8125rem]">{t('subtitle')}</p>
        </div>

        <div className="border-border flex items-center justify-between gap-3 border-b pb-3">
          <DateHeading date={date} timezone={timezone} />
          <DateNav date={date} timezone={timezone} onChange={setDate} />
        </div>
      </header>

      {dashboard.isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : dashboard.isError ? (
        <ErrorState onRetry={() => void dashboard.refetch()} />
      ) : (
        <Columns>
          <Column>
            <div className="border-border bg-surface flex items-baseline justify-between rounded-lg border px-4 py-3">
              <span className="label-caps">{t('burnedToday')}</span>
              <span className="metric-lg">
                {format.kcal(dashboard.data.calories.activityKcal)}
                <span className="text-foreground-subtle ml-1 text-xs font-normal">
                  {units('kcal')}
                </span>
              </span>
            </div>

            <WalkingSummary walking={dashboard.data.walking} />

            <ActivityList
              title={t('walkingSessions')}
              activities={walkingSessions}
              onAdd={() => setDialog({ open: true, category: 'WALKING' })}
            />

            <WeekStrip days={week.data ?? []} selected={date} onSelect={setDate} metric="burned" />
          </Column>

          <Column>
            <ActivityList
              title={t('workouts')}
              activities={otherSessions}
              onAdd={() => setDialog({ open: true, category: 'STRENGTH' })}
            />

            <WorkoutsSection
              date={date}
              onCreate={() => setWorkoutDialog({ open: true })}
              onEdit={(workout) => setWorkoutDialog({ open: true, workout })}
            />

            <ExercisesSection
              date={date}
              onCreate={() => openExercise({ kind: 'exercise' })}
              onEdit={(exercise) => openExercise({ kind: 'exercise', exercise })}
            />
          </Column>
        </Columns>
      )}

      <ActivityDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        date={date}
        preferCategory={dialog.category}
        target={dialog.target}
      />

      <WorkoutDialog
        open={workoutDialog.open}
        onOpenChange={(open) => setWorkoutDialog((current) => ({ ...current, open }))}
        workout={workoutDialog.workout}
        onCreateExercise={() => openExercise({ kind: 'exercise' })}
      />
    </div>
  );
};

const ActivityPage = () => (
  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
    <ActivityView />
  </Suspense>
);

export default ActivityPage;
