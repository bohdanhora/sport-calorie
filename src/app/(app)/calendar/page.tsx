'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

import { ActivityDialog, type ActivityDialogTarget } from '@/components/activity/activity-dialog';
import { AddToDayDialog } from '@/components/calendar/add-to-day-dialog';
import { PlanBoard } from '@/components/calendar/plan-board';
import { PlanDialog } from '@/components/calendar/plan-dialog';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelectedDate } from '@/hooks/use-selected-date';
import { plansApi, savedExercisesApi, workoutsApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth/auth-provider';
import {
  addDays,
  formatDateRange,
  startOfWeek,
  todayIn,
  weekStartsOnFor,
} from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

const DAYS_IN_WEEK = 7;

const CalendarView = () => {
  const t = useTranslations('calendar');
  const units = useTranslations('units');
  const { timezone } = useAuth();
  const format = useFormat();
  const [date, setDate] = useSelectedDate(timezone);
  const today = todayIn(timezone);

  const weekStartsOn = weekStartsOnFor(format.locale);
  const from = startOfWeek(date, weekStartsOn);
  const to = addDays(from, DAYS_IN_WEEK - 1);
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(from, index));
  const isCurrentWeek = today >= from && today <= to;

  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [activity, setActivity] = useState<{
    open: boolean;
    date: string;
    target?: ActivityDialogTarget;
  }>({ open: false, date: today });

  const calendarKey = queryKeys.calendar(from, to);
  const calendar = useQuery({
    queryKey: calendarKey,
    queryFn: () => plansApi.calendar(from, to),
    placeholderData: (previous) => previous,
  });
  const workouts = useQuery({ queryKey: queryKeys.workouts, queryFn: workoutsApi.list });
  const exercises = useQuery({
    queryKey: queryKeys.savedExercises,
    queryFn: savedExercisesApi.list,
  });

  const openPlan = calendar.data?.plans.find((plan) => plan.id === openPlanId) ?? null;

  const doneKcal =
    (calendar.data?.plans ?? [])
      .filter((plan) => plan.completedAt)
      .reduce((sum, plan) => sum + plan.energyKcal, 0) +
    (calendar.data?.activities ?? []).reduce((sum, entry) => sum + entry.energyKcal, 0);
  const plannedKcal = (calendar.data?.plans ?? [])
    .filter((plan) => !plan.completedAt)
    .reduce((sum, plan) => sum + plan.energyKcal, 0);

  const planCustom = ({ date: day, position }: { date: string; position?: number }): void => {
    setAddDate(null);
    setActivity({ open: true, date: day, target: { kind: 'plan', position } });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="space-y-0.5">
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-foreground-subtle text-[0.8125rem]">{t('subtitle')}</p>
        </div>

        <div className="border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b pb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{formatDateRange(from, to, format.locale)}</p>
            <p className="numeric text-foreground-subtle mt-0.5 text-xs">
              {t('weekDone', { value: format.kcal(doneKcal) })}
              <span className="text-border-strong mx-1.5">·</span>
              {t('weekPlanned', { value: format.kcal(plannedKcal) })} {units('kcal')}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isCurrentWeek ? (
              <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
                {t('thisWeek')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('previousWeek')}
              onClick={() => setDate(addDays(from, -DAYS_IN_WEEK))}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('nextWeek')}
              onClick={() => setDate(addDays(from, DAYS_IN_WEEK))}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {calendar.isPending ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : calendar.isError ? (
        <ErrorState onRetry={() => void calendar.refetch()} />
      ) : (
        <PlanBoard
          days={days}
          today={today}
          calendar={calendar.data}
          calendarKey={calendarKey}
          workouts={workouts.data ?? []}
          exercises={exercises.data ?? []}
          onOpenPlan={(plan) => setOpenPlanId(plan.id)}
          onAddToDay={setAddDate}
          onCustom={planCustom}
        />
      )}

      <PlanDialog
        plan={openPlan}
        today={today}
        onOpenChange={(open) => {
          if (!open) {
            setOpenPlanId(null);
          }
        }}
        onEdit={(plan) => {
          setOpenPlanId(null);
          setActivity({ open: true, date: plan.date, target: { kind: 'plan', plan } });
        }}
      />

      <AddToDayDialog
        date={addDate}
        workouts={workouts.data ?? []}
        exercises={exercises.data ?? []}
        onOpenChange={(open) => {
          if (!open) {
            setAddDate(null);
          }
        }}
        onCustom={(day) => planCustom({ date: day })}
      />

      <ActivityDialog
        open={activity.open}
        onOpenChange={(open) => setActivity((current) => ({ ...current, open }))}
        date={activity.date}
        preferCategory="WALKING"
        target={activity.target}
      />
    </div>
  );
};

const CalendarPage = () => (
  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
    <CalendarView />
  </Suspense>
);

export default CalendarPage;
