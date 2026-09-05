'use client';

import { useTranslations } from 'next-intl';

import type { ActivityBreakdown as ActivityBreakdownData } from '@/lib/api/types';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';

interface ActivityBreakdownProps {
  activities: ActivityBreakdownData[];
}

/** Four tokens, cycled: a long list keeps its colours without inventing any. */
const BARS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4'] as const;

/**
 * A list of numbers made every activity look alike. The bar carries each one's
 * share of the energy burned, so the one activity that does the work is
 * obvious at a glance.
 */
export const ActivityBreakdown = ({ activities }: ActivityBreakdownProps) => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();

  const peak = Math.max(...activities.map((activity) => activity.energyKcal), 1);
  const total = activities.reduce((sum, activity) => sum + activity.energyKcal, 0);

  return (
    <ul className="divide-border border-border bg-surface divide-y overflow-hidden rounded-lg border">
      {activities.map((activity, index) => (
        <li
          key={activity.activityTypeId}
          className="animate-row space-y-2 px-4 py-3.5"
          style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm">{activityName(activity)}</p>
            <p className="numeric shrink-0 text-sm">
              {format.kcal(activity.energyKcal)} {units('kcal')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-surface-muted h-1.5 flex-1 overflow-hidden rounded-full" aria-hidden>
              <div
                className={`${BARS[index % BARS.length]} h-full rounded-full transition-[width] duration-500 ease-out`}
                style={{ width: `${(activity.energyKcal / peak) * 100}%` }}
              />
            </div>
            <p className="numeric text-foreground-subtle shrink-0 text-xs">
              {total > 0 ? `${Math.round((activity.energyKcal / total) * 100)}%` : '0%'}
            </p>
          </div>

          <p className="numeric text-foreground-subtle text-xs">
            {t('sessions', { count: activity.sessions })}
            {activity.durationSec > 0 ? ` · ${format.duration(activity.durationSec)}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
};
