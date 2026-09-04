'use client';

import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { useToast } from '@/components/ui/toast';
import { activitiesApi } from '@/lib/api/endpoints';
import type { ActivityEntry } from '@/lib/api/types';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import type { AppFormat } from '@/lib/format/use-format';

type ActivityTexts = ReturnType<typeof useTranslations<'activityForm'>>;

const describeActivity = (entry: ActivityEntry, format: AppFormat, t: ActivityTexts): string => {
  const parts: string[] = [];

  if (entry.durationSec) {
    parts.push(format.duration(entry.durationSec));
  }

  if (entry.distanceM) {
    parts.push(format.distance(entry.distanceM));
  }

  if (entry.avgSpeedKmh) {
    parts.push(format.speed(entry.avgSpeedKmh));
  }

  if (entry.inclinePercent) {
    parts.push(t('inclineValue', { value: entry.inclinePercent }));
  }

  if (entry.sets && entry.reps) {
    parts.push(t('setsAndReps', { sets: entry.sets, reps: entry.reps }));
  } else if (entry.reps) {
    parts.push(t('repsOnly', { reps: entry.reps }));
  }

  return parts.join(' · ');
};

interface ActivityListProps {
  activities: ActivityEntry[];
  onAdd: () => void;
  title?: string;
}

export const ActivityList = ({ activities, onAdd, title }: ActivityListProps) => {
  const t = useTranslations('today');
  const form = useTranslations('activityForm');
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const removeEntry = useMutation({
    mutationFn: activitiesApi.remove,
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: form('removed') });
    },
    onError: () => showToast({ title: form('removeFailed'), tone: 'danger' }),
  });

  const total = activities.reduce((sum, entry) => sum + entry.energyKcal, 0);

  return (
    <Section
      title={title ?? t('activity')}
      action={
        total > 0 ? (
          <span className="numeric text-foreground-subtle text-xs">
            {format.kcal(total)} {units('kcal')}
          </span>
        ) : null
      }
    >
      {activities.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed px-5 py-7 text-center">
          <p className="text-sm font-medium">{t('noActivity')}</p>
          <p className="text-foreground-muted mt-1 text-[0.8125rem]">{t('noActivityHint')}</p>
          <Button size="sm" className="mt-4" onClick={onAdd}>
            {t('addActivity')}
          </Button>
        </div>
      ) : (
        <ul className="divide-border border-border bg-surface divide-y overflow-hidden rounded-lg border">
          {activities.map((entry, index) => (
            <li
              key={entry.id}
              className="group animate-row hover:bg-surface-muted/60 flex items-center gap-3 px-4 py-3 transition-colors duration-150"
              style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {entry.title ? (
                    <>
                      {entry.title}
                      <span className="text-foreground-subtle">
                        {' '}
                        · {activityName(entry.activityType)}
                      </span>
                    </>
                  ) : (
                    activityName(entry.activityType)
                  )}
                </p>
                <p className="numeric text-foreground-subtle mt-0.5 text-xs">
                  {describeActivity(entry, format, form)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="numeric text-sm">{format.kcal(entry.energyKcal)}</p>
                {entry.energySource === 'ESTIMATED' ? (
                  <p className="text-foreground-subtle text-[0.625rem] tracking-wide uppercase">
                    {t('estimate')}
                  </p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label={form('removeEntry', { name: activityName(entry.activityType) })}
                disabled={removeEntry.isPending}
                onClick={() => removeEntry.mutate(entry.id)}
                className="text-foreground-subtle opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};
