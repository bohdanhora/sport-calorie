'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

import { ActivityDialog } from '@/components/activity/activity-dialog';
import { DateHeading, DateNav } from '@/components/layout/date-nav';
import { ErrorState } from '@/components/states/error-state';
import { ActivityList } from '@/components/today/activity-list';
import { WalkingSummary } from '@/components/today/walking-summary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelectedDate } from '@/hooks/use-selected-date';
import { summaryApi } from '@/lib/api/endpoints';
import type { ActivityCategory } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';

const ActivityView = () => {
  const t = useTranslations('activityPage');
  const units = useTranslations('units');
  const { timezone } = useAuth();
  const format = useFormat();
  const [date, setDate] = useSelectedDate(timezone);
  const [dialog, setDialog] = useState<{ open: boolean; category?: ActivityCategory }>({
    open: false,
  });

  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(date),
    queryFn: () => summaryApi.dashboard(date),
  });

  const walkingSessions =
    dashboard.data?.activities.filter((entry) => entry.activityType.category === 'WALKING') ?? [];
  const otherSessions =
    dashboard.data?.activities.filter((entry) => entry.activityType.category !== 'WALKING') ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{t('title')}</h1>
            <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
          </div>
          <Button size="sm" onClick={() => setDialog({ open: true })}>
            <Plus className="size-4" aria-hidden />
            {t('logActivity')}
          </Button>
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
        <>
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

          <ActivityList
            title={t('workouts')}
            activities={otherSessions}
            onAdd={() => setDialog({ open: true, category: 'STRENGTH' })}
          />
        </>
      )}

      <ActivityDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        date={date}
        preferCategory={dialog.category}
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
