'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import type { ActivityEntry, Plan } from '@/lib/api/types';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

export type PlanState = 'planned' | 'done' | 'missed';

export const usePlanName = (): ((plan: Plan) => string) => {
  const activityName = useActivityTypeName();

  return (plan) => {
    const [only] = plan.exercises;

    return plan.kind === 'ACTIVITY' && only && only.name === only.activityType.name
      ? activityName(only.activityType)
      : plan.name;
  };
};

export const planStateOf = (plan: Pick<Plan, 'completedAt' | 'date'>, today: string): PlanState =>
  plan.completedAt ? 'done' : plan.date < today ? 'missed' : 'planned';

const CARD_STATES: Record<PlanState, string> = {
  planned: 'border-accent/25 bg-accent-soft text-foreground',
  done: 'border-transparent bg-accent text-accent-foreground',
  missed: 'border-border-strong border-dashed bg-surface text-foreground-muted',
};

const META_STATES: Record<PlanState, string> = {
  planned: 'text-foreground-muted',
  done: 'text-accent-foreground/80',
  missed: 'text-foreground-subtle',
};

interface PlanCardBodyProps {
  plan: Plan;
  state: PlanState;
  className?: string;
  inlineCheck?: boolean;
}

export const PlanCardBody = ({ plan, state, className, inlineCheck = true }: PlanCardBodyProps) => {
  const t = useTranslations('calendar');
  const units = useTranslations('units');
  const format = useFormat();
  const planName = usePlanName();

  const extra =
    plan.kind === 'WORKOUT'
      ? t('exerciseCountShort', { count: plan.exercises.length })
      : plan.durationSec > 0
        ? format.duration(plan.durationSec)
        : null;

  return (
    <div
      className={cn(
        'w-full rounded-md border px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow,opacity] duration-150',
        CARD_STATES[state],
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-[0.8125rem] leading-5 font-medium">
        {state === 'done' && inlineCheck ? (
          <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />
        ) : null}
        <span className="min-w-0 truncate">{planName(plan)}</span>
      </p>
      <p className={cn('numeric truncate text-xs leading-4', META_STATES[state])}>
        {format.kcal(plan.energyKcal)} {units('kcal')}
        {extra ? ` · ${extra}` : ''}
      </p>
    </div>
  );
};

export const LoggedRow = ({ entry, action }: { entry: ActivityEntry; action?: ReactNode }) => {
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();

  return (
    <div className="group bg-surface-muted text-foreground-muted flex items-start gap-1.5 rounded-md px-2.5 py-1.5">
      <Check className="text-accent mt-0.5 size-3.5 shrink-0" strokeWidth={3} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs leading-5">
          {entry.title ?? activityName(entry.activityType)}
        </p>
        <p className="numeric text-foreground-subtle truncate text-[0.6875rem] leading-4">
          {format.kcal(entry.energyKcal)} {units('kcal')}
        </p>
      </div>
      {action}
    </div>
  );
};
