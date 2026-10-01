'use client';

import { useMutation } from '@tanstack/react-query';
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { describeActivity } from '@/components/today/activity-list';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { plansApi } from '@/lib/api/endpoints';
import type { Plan } from '@/lib/api/types';
import { addMonths } from '@/lib/format/dates';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import { cn } from '@/lib/utils/cn';

import { planStateOf, usePlanName } from './plan-card';

const DATE_RANGE_MONTHS = 12;

interface PlanDialogProps {
  plan: Plan | null;
  today: string;
  onOpenChange: (open: boolean) => void;
  onEdit: (plan: Plan) => void;
}

export const PlanDialog = ({ plan, today, onOpenChange, onEdit }: PlanDialogProps) => {
  const t = useTranslations('calendar');
  const form = useTranslations('activityForm');
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();
  const planName = usePlanName();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const onError = (error: unknown): void =>
    showToast({
      title: t('saveFailed'),
      description: error instanceof ApiError ? error.message : undefined,
      tone: 'danger',
    });

  const complete = useMutation({
    mutationFn: (id: string) => plansApi.complete(id),
    onSuccess: async (done) => {
      await invalidateDay();
      showToast({
        title: t('markedDone', { name: done.name }),
        description: t('burnedValue', { value: format.kcal(done.energyKcal) }),
      });
    },
    onError,
  });

  const reopen = useMutation({
    mutationFn: (id: string) => plansApi.reopen(id),
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('reopened') });
    },
    onError,
  });

  const move = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => plansApi.update(id, { date }),
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('moved') });
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('removed') });
      onOpenChange(false);
    },
    onError,
  });

  const state = plan ? planStateOf(plan, today) : 'planned';
  const isFuture = plan ? plan.date > today : false;
  const busy = complete.isPending || reopen.isPending || remove.isPending || move.isPending;

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={onOpenChange}
      title={plan ? planName(plan) : ''}
      description={plan ? format.fullDate(plan.date) : undefined}
    >
      {plan ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium',
                state === 'done' && 'bg-accent text-accent-foreground',
                state === 'planned' && 'bg-accent-soft text-accent',
                state === 'missed' && 'bg-surface-muted text-foreground-muted',
              )}
            >
              {state === 'done' ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
              {t(`state.${state}`)}
            </span>
            <span className="text-foreground-subtle text-xs">{t(`kind.${plan.kind}`)}</span>
          </div>

          <ul className="divide-border border-border bg-surface divide-y overflow-hidden rounded-lg border">
            {(state === 'done' && plan.entries.length > 0
              ? plan.entries.map((entry) => ({
                  key: entry.id,
                  name: entry.title ?? activityName(entry.activityType),
                  type: activityName(entry.activityType),
                  details: describeActivity(entry, format, form),
                  energyKcal: entry.energyKcal,
                }))
              : plan.exercises.map((exercise, index) => ({
                  key: `${exercise.id}-${index}`,
                  name: exercise.name,
                  type: activityName(exercise.activityType),
                  details: describeActivity(exercise, format, form),
                  energyKcal: exercise.energyKcal,
                }))
            ).map((row) => (
              <li key={row.key} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {row.name}
                    {row.name !== row.type ? (
                      <span className="text-foreground-subtle"> · {row.type}</span>
                    ) : null}
                  </p>
                  {row.details ? (
                    <p className="numeric text-foreground-subtle mt-0.5 truncate text-xs">
                      {row.details}
                    </p>
                  ) : null}
                </div>
                <p className="numeric shrink-0 text-sm">{format.kcal(row.energyKcal)}</p>
              </li>
            ))}
          </ul>

          <div className="border-border bg-surface-muted flex items-baseline justify-between gap-3 rounded-md border px-4 py-3">
            <div>
              <p className="label-caps">{state === 'done' ? t('burned') : t('willBurn')}</p>
              {plan.durationSec > 0 ? (
                <p className="numeric text-foreground-subtle mt-1 text-xs">
                  {format.duration(plan.durationSec)}
                </p>
              ) : null}
            </div>
            <p className="metric-md shrink-0">
              {format.kcal(plan.energyKcal)}
              <span className="text-foreground-subtle ml-1 text-xs font-normal">
                {units('kcal')}
              </span>
            </p>
          </div>

          <Field label={t('day')}>
            {(props) => (
              <DateField
                {...props}
                value={plan.date}
                min={addMonths(today, -DATE_RANGE_MONTHS)}
                max={addMonths(today, DATE_RANGE_MONTHS)}
                today={today}
                onChange={(date) => {
                  if (date !== plan.date) {
                    move.mutate({ id: plan.id, date });
                  }
                }}
              />
            )}
          </Field>

          <div className="bg-surface-raised border-border sticky -bottom-[max(1rem,env(safe-area-inset-bottom))] -mx-5 mt-1 -mb-[max(1rem,env(safe-area-inset-bottom))] flex flex-wrap items-center gap-2 border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {state === 'done' ? (
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                disabled={busy}
                onClick={() => reopen.mutate(plan.id)}
              >
                <RotateCcw className="size-4" aria-hidden />
                {t('undoDone')}
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1"
                disabled={busy || isFuture}
                onClick={() => complete.mutate(plan.id)}
              >
                <Check className="size-4" aria-hidden />
                {isFuture ? t('doneOnTheDay') : t('markDone')}
              </Button>
            )}

            {plan.kind === 'ACTIVITY' && state !== 'done' ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t('edit')}
                disabled={busy}
                onClick={() => onEdit(plan)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            ) : null}

            <Button
              variant="danger"
              size="icon"
              className="size-11"
              aria-label={t('remove')}
              disabled={busy}
              onClick={() => remove.mutate(plan.id)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
};
