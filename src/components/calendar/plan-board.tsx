'use client';

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Dumbbell, GripVertical, PencilLine, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type ReactNode } from 'react';

import { useToast } from '@/components/ui/toast';
import { activitiesApi, plansApi, type PlanInput } from '@/lib/api/endpoints';
import type { ActivityEntry, Calendar, Plan, SavedExercise, Workout } from '@/lib/api/types';
import {
  isSamePlace,
  movePlan,
  plansForDay,
  resolveDrop,
  type DropTarget,
  type Placement,
} from '@/lib/calendar/placement';
import { formatDayOfMonth, formatWeekdayShort } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import { cn } from '@/lib/utils/cn';

import { LoggedRow, PlanCardBody, planStateOf, usePlanName } from './plan-card';

const TEMP_PREFIX = 'temp-';
const TOUCH_HOLD_MS = 180;
const TOUCH_TOLERANCE_PX = 8;
const MOUSE_DISTANCE_PX = 4;

type DragSource =
  | { kind: 'plan'; plan: Plan }
  | { kind: 'workout'; workout: Workout }
  | { kind: 'exercise'; exercise: SavedExercise }
  | { kind: 'custom' };

const toDropTarget = (id: string | number | undefined): DropTarget | null => {
  const value = String(id ?? '');

  if (value.startsWith('day:')) {
    return { type: 'day', date: value.slice(4) };
  }

  if (value.startsWith('slot:')) {
    return { type: 'slot', planId: value.slice(5) };
  }

  return null;
};

const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const slot = within.find((collision) => String(collision.id).startsWith('slot:'));

  if (slot) {
    return [slot];
  }

  return within.length > 0 ? within : rectIntersection(args);
};

const draftPlan = (source: DragSource, placement: Placement): Plan | null => {
  const base = {
    id: `${TEMP_PREFIX}${Date.now()}`,
    date: placement.date,
    position: placement.position,
    completedAt: null,
    entries: [],
  };

  if (source.kind === 'workout') {
    const { workout } = source;

    return {
      ...base,
      kind: 'WORKOUT',
      name: workout.name,
      workoutId: workout.id,
      exerciseId: null,
      exercises: workout.exercises,
      energyKcal: workout.energyKcal,
      durationSec: workout.durationSec,
    };
  }

  if (source.kind === 'exercise') {
    const { exercise } = source;

    return {
      ...base,
      kind: 'EXERCISE',
      name: exercise.name,
      workoutId: null,
      exerciseId: exercise.id,
      exercises: [exercise],
      energyKcal: exercise.energyKcal,
      durationSec: exercise.effectiveDurationSec,
    };
  }

  return null;
};

interface PlanBoardProps {
  days: string[];
  today: string;
  calendar: Calendar;
  calendarKey: readonly unknown[];
  workouts: Workout[];
  exercises: SavedExercise[];
  onOpenPlan: (plan: Plan) => void;
  onAddToDay: (date: string) => void;
  onCustom: (placement: { date: string; position?: number }) => void;
}

export const PlanBoard = ({
  days,
  today,
  calendar,
  calendarKey,
  workouts,
  exercises,
  onOpenPlan,
  onAddToDay,
  onCustom,
}: PlanBoardProps) => {
  const t = useTranslations('calendar');
  const queryClient = useQueryClient();
  const format = useFormat();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();
  const [active, setActive] = useState<DragSource | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);
  const justDragged = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: TOUCH_TOLERANCE_PX },
    }),
  );

  const patchCalendar = (update: (current: Calendar) => Calendar): void => {
    queryClient.setQueryData<Calendar>(calendarKey, (current) =>
      current ? update(current) : current,
    );
  };

  const onFailure = async (): Promise<void> => {
    showToast({ title: t('saveFailed'), tone: 'danger' });
    await queryClient.invalidateQueries({ queryKey: calendarKey });
  };

  const movePlanMutation = useMutation({
    mutationFn: ({ id, placement }: { id: string; placement: Placement }) =>
      plansApi.update(id, placement),
    onSuccess: () => invalidateDay(),
    onError: onFailure,
  });

  const createPlan = useMutation({
    mutationFn: (input: PlanInput) => plansApi.create(input),
    onSuccess: () => invalidateDay(),
    onError: onFailure,
  });

  const toggleDone = useMutation({
    mutationFn: (plan: Plan) =>
      plan.completedAt ? plansApi.reopen(plan.id) : plansApi.complete(plan.id),
    onMutate: (plan) =>
      patchCalendar((current) => ({
        ...current,
        plans: current.plans.map((item) =>
          item.id === plan.id
            ? { ...item, completedAt: plan.completedAt ? null : new Date().toISOString() }
            : item,
        ),
      })),
    onSuccess: async (updated) => {
      await invalidateDay();
      showToast({
        title: updated.completedAt ? t('markedDone', { name: updated.name }) : t('reopened'),
        description: updated.completedAt
          ? t('burnedValue', { value: format.kcal(updated.energyKcal) })
          : undefined,
      });
    },
    onError: onFailure,
  });

  const removeEntry = useMutation({
    mutationFn: (entry: ActivityEntry) => activitiesApi.remove(entry.id),
    onMutate: (entry) =>
      patchCalendar((current) => ({
        ...current,
        activities: current.activities.filter((item) => item.id !== entry.id),
      })),
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('entryRemoved') });
    },
    onError: onFailure,
  });

  const reset = (): void => {
    setActive(null);
    setOver(null);
  };

  const onDragStart = (event: DragStartEvent): void => {
    setActive((event.active.data.current as DragSource | undefined) ?? null);
  };

  const onDragOver = (event: DragOverEvent): void => {
    setOver(toDropTarget(event.over?.id));
  };

  const onDragEnd = (event: DragEndEvent): void => {
    const source = event.active.data.current as DragSource | undefined;
    const target = toDropTarget(event.over?.id);

    reset();
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);

    if (!source || !target) {
      return;
    }

    const movingId = source.kind === 'plan' ? source.plan.id : undefined;
    const placement = resolveDrop(calendar.plans, target, movingId);

    if (!placement) {
      return;
    }

    if (source.kind === 'plan') {
      if (
        source.plan.id.startsWith(TEMP_PREFIX) ||
        isSamePlace(calendar.plans, source.plan.id, placement)
      ) {
        return;
      }

      patchCalendar((current) => ({
        ...current,
        plans: movePlan(current.plans, source.plan.id, placement),
      }));
      movePlanMutation.mutate({ id: source.plan.id, placement });
      return;
    }

    if (source.kind === 'custom') {
      onCustom(placement);
      return;
    }

    const draft = draftPlan(source, placement);

    if (draft) {
      patchCalendar((current) => ({
        ...current,
        plans: movePlan(
          [...current.plans, { ...draft, position: Number.MAX_SAFE_INTEGER }],
          draft.id,
          placement,
        ),
      }));
    }

    createPlan.mutate({
      ...placement,
      ...(source.kind === 'workout'
        ? { workoutId: source.workout.id }
        : { exerciseId: source.exercise.id }),
    });
  };

  const openPlan = (plan: Plan): void => {
    if (justDragged.current || plan.id.startsWith(TEMP_PREFIX)) {
      return;
    }

    onOpenPlan(plan);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      autoScroll={{ threshold: { x: 0, y: 0.15 } }}
    >
      <Palette
        workouts={workouts}
        exercises={exercises}
        onCustom={() => onCustom({ date: today })}
      />

      <div className="space-y-2 xl:grid xl:grid-cols-7 xl:gap-2 xl:space-y-0">
        {days.map((date) => (
          <DayColumn
            key={date}
            date={date}
            today={today}
            plans={plansForDay(calendar.plans, date)}
            logged={calendar.activities.filter((entry) => entry.date === date)}
            over={over}
            dragging={active !== null}
            movingId={active?.kind === 'plan' ? active.plan.id : undefined}
            onOpenPlan={openPlan}
            onToggleDone={(plan) => toggleDone.mutate(plan)}
            onRemoveEntry={(entry) => removeEntry.mutate(entry)}
            onAdd={() => onAddToDay(date)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {active ? <DragPreview source={active} today={today} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

const DragPreview = ({ source, today }: { source: DragSource; today: string }) => {
  if (source.kind === 'plan') {
    return (
      <PlanCardBody
        plan={source.plan}
        state={planStateOf(source.plan, today)}
        className="rotate-1 cursor-grabbing shadow-[0_8px_24px_rgb(0_0_0/0.16)]"
      />
    );
  }

  return <ChipBody source={source} lifted />;
};

const ChipBody = ({ source, lifted = false }: { source: DragSource; lifted?: boolean }) => {
  const t = useTranslations('calendar');
  const units = useTranslations('units');
  const format = useFormat();

  const label =
    source.kind === 'workout'
      ? source.workout.name
      : source.kind === 'exercise'
        ? source.exercise.name
        : t('oneOff');

  const kcal =
    source.kind === 'workout'
      ? source.workout.energyKcal
      : source.kind === 'exercise'
        ? source.exercise.energyKcal
        : null;

  return (
    <span
      className={cn(
        'border-border bg-surface flex h-10 max-w-56 items-center gap-1.5 rounded-full border pr-3.5 pl-2 text-[0.8125rem] whitespace-nowrap select-none sm:h-9',
        lifted ? 'cursor-grabbing shadow-[0_8px_24px_rgb(0_0_0/0.16)]' : 'cursor-grab',
        source.kind === 'workout' && 'border-accent/30 bg-accent-soft',
      )}
    >
      {source.kind === 'custom' ? (
        <PencilLine className="text-foreground-subtle size-4 shrink-0" aria-hidden />
      ) : source.kind === 'workout' ? (
        <Dumbbell className="text-accent size-4 shrink-0" aria-hidden />
      ) : (
        <GripVertical className="text-foreground-subtle size-4 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 truncate font-medium">{label}</span>
      {kcal !== null ? (
        <span className="numeric text-foreground-subtle shrink-0 text-xs">
          {format.kcal(kcal)} {units('kcal')}
        </span>
      ) : null}
    </span>
  );
};

const PaletteChip = ({ id, source }: { id: string; source: DragSource }) => {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id, data: source });

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      className={cn(
        'shrink-0 touch-manipulation [-webkit-touch-callout:none]',
        isDragging && 'opacity-40',
      )}
    >
      <ChipBody source={source} />
    </li>
  );
};

const CustomChip = ({ onClick }: { onClick: () => void }) => {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: 'custom',
    data: { kind: 'custom' } satisfies DragSource,
  });

  return (
    <li className={cn('shrink-0', isDragging && 'opacity-40')}>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        onClick={onClick}
        className="press focus-visible:ring-ring/30 block touch-manipulation rounded-full [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:outline-none"
      >
        <ChipBody source={{ kind: 'custom' }} />
      </button>
    </li>
  );
};

const Palette = ({
  workouts,
  exercises,
  onCustom,
}: {
  workouts: Workout[];
  exercises: SavedExercise[];
  onCustom: () => void;
}) => {
  const t = useTranslations('calendar');

  return (
    <section aria-label={t('palette')} className="mb-4 space-y-2">
      <p className="text-foreground-subtle text-xs">{t('paletteHint')}</p>
      <ul className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 lg:-mx-8 lg:px-8 xl:mx-0 xl:flex-wrap xl:overflow-visible xl:px-0 [&::-webkit-scrollbar]:hidden">
        {workouts.map((workout) => (
          <PaletteChip
            key={workout.id}
            id={`workout:${workout.id}`}
            source={{ kind: 'workout', workout }}
          />
        ))}
        {exercises.map((exercise) => (
          <PaletteChip
            key={exercise.id}
            id={`exercise:${exercise.id}`}
            source={{ kind: 'exercise', exercise }}
          />
        ))}
        <CustomChip onClick={onCustom} />
      </ul>
    </section>
  );
};

const InsertLine = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'bg-accent pointer-events-none absolute inset-x-0.5 h-0.5 rounded-full',
      className,
    )}
  />
);

interface DayColumnProps {
  date: string;
  today: string;
  plans: Plan[];
  logged: ActivityEntry[];
  over: DropTarget | null;
  dragging: boolean;
  movingId?: string;
  onOpenPlan: (plan: Plan) => void;
  onToggleDone: (plan: Plan) => void;
  onRemoveEntry: (entry: ActivityEntry) => void;
  onAdd: () => void;
}

const DayColumn = ({
  date,
  today,
  plans,
  logged,
  over,
  dragging,
  movingId,
  onOpenPlan,
  onToggleDone,
  onRemoveEntry,
  onAdd,
}: DayColumnProps) => {
  const t = useTranslations('calendar');
  const units = useTranslations('units');
  const format = useFormat();
  const { setNodeRef } = useDroppable({ id: `day:${date}` });

  const isToday = date === today;
  const overSlot = over?.type === 'slot' ? over.planId : null;
  const targeted =
    (over?.type === 'day' && over.date === date) ||
    (overSlot !== null && plans.some((plan) => plan.id === overSlot));
  const appendHere = over?.type === 'day' && over.date === date;
  const total =
    plans.reduce((sum, plan) => sum + plan.energyKcal, 0) +
    logged.reduce((sum, entry) => sum + entry.energyKcal, 0);
  const isEmpty = plans.length === 0 && logged.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-border bg-surface flex gap-3 rounded-lg border p-2.5 transition-[background-color,border-color,box-shadow] duration-150 xl:min-h-80 xl:flex-col xl:gap-2 xl:p-2',
        isToday && 'border-accent/40',
        targeted && 'border-accent/60 bg-accent-soft/40 ring-accent/15 ring-3',
      )}
    >
      <header className="flex w-12 shrink-0 flex-col items-center gap-1 pt-0.5 xl:w-auto xl:flex-row xl:items-center xl:justify-between xl:gap-2 xl:px-1 xl:pt-0">
        <div className="flex flex-col items-center gap-0.5 xl:flex-row xl:items-baseline xl:gap-2">
          <span className={cn('label-caps leading-none', isToday && 'text-accent')}>
            {formatWeekdayShort(date, format.locale)}
          </span>
          <span
            className={cn(
              'numeric flex size-8 items-center justify-center rounded-full text-base font-semibold xl:size-7 xl:text-[0.9375rem]',
              isToday && 'bg-accent text-accent-foreground',
            )}
          >
            {formatDayOfMonth(date, format.locale)}
          </span>
        </div>

        {total > 0 ? (
          <span className="numeric text-foreground-subtle text-[0.6875rem] leading-none xl:hidden">
            {format.kcal(total)}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onAdd}
          aria-label={t('addToDay', { date: format.fullDate(date) })}
          className="text-foreground-subtle hover:bg-surface-muted hover:text-foreground hidden size-8 items-center justify-center rounded-md transition-colors duration-150 xl:flex"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </header>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {plans.map((plan) => (
          <PlanSlot
            key={plan.id}
            plan={plan}
            today={today}
            insertBefore={overSlot === plan.id}
            moving={movingId === plan.id}
            onOpen={() => onOpenPlan(plan)}
            onToggleDone={() => onToggleDone(plan)}
          />
        ))}

        {logged.map((entry) => (
          <LoggedRow
            key={entry.id}
            entry={entry}
            action={
              <button
                type="button"
                onClick={() => onRemoveEntry(entry)}
                aria-label={t('removeEntry', { name: entry.title ?? entry.activityType.name })}
                className="text-foreground-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-ring/30 -my-1 -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-md opacity-0 transition-[opacity,background-color,color] duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:outline-none max-xl:-my-2 max-xl:size-10 max-xl:opacity-100"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            }
          />
        ))}

        <div className="relative">{appendHere ? <InsertLine className="-top-1" /> : null}</div>

        {isEmpty ? (
          <p
            className={cn(
              'text-foreground-subtle flex min-h-10 flex-1 items-center text-xs transition-colors duration-150 xl:justify-center xl:text-center',
              dragging && 'text-accent',
            )}
          >
            {dragging ? t('dropHere') : t('nothingPlanned')}
          </p>
        ) : null}

        <div className="mt-auto hidden items-center justify-between px-1 pt-1 xl:flex">
          {total > 0 ? (
            <span className="numeric text-foreground-subtle text-[0.6875rem]">
              {format.kcal(total)} {units('kcal')}
            </span>
          ) : (
            <span />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        aria-label={t('addToDay', { date: format.fullDate(date) })}
        className="text-foreground-subtle hover:bg-surface-muted hover:text-foreground flex size-10 shrink-0 items-center justify-center self-start rounded-md transition-colors duration-150 xl:hidden"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
};

interface PlanSlotProps {
  plan: Plan;
  today: string;
  insertBefore: boolean;
  moving: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
}

const PlanSlot = ({
  plan,
  today,
  insertBefore,
  moving,
  onOpen,
  onToggleDone,
}: PlanSlotProps): ReactNode => {
  const t = useTranslations('calendar');
  const draggable = useDraggable({
    id: `plan:${plan.id}`,
    data: { kind: 'plan', plan } satisfies DragSource,
    disabled: plan.id.startsWith(TEMP_PREFIX),
  });
  const droppable = useDroppable({ id: `slot:${plan.id}`, disabled: moving });
  const planName = usePlanName();
  const isTemp = plan.id.startsWith(TEMP_PREFIX);
  const canCheck = !isTemp && plan.date <= today;
  const done = plan.completedAt !== null;

  return (
    <div ref={droppable.setNodeRef} className="relative">
      {insertBefore ? <InsertLine className="-top-1" /> : null}
      <button
        ref={draggable.setNodeRef}
        type="button"
        {...draggable.listeners}
        onClick={onOpen}
        aria-label={t('openPlan', { name: planName(plan) })}
        className={cn(
          'press focus-visible:ring-ring/30 block w-full cursor-grab touch-manipulation rounded-md select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:outline-none',
          moving && 'opacity-40',
          plan.id.startsWith(TEMP_PREFIX) && 'animate-pulse cursor-default',
        )}
      >
        <PlanCardBody
          plan={plan}
          state={planStateOf(plan, today)}
          className={canCheck ? 'pr-9 max-xl:pr-11' : undefined}
          inlineCheck={!canCheck}
        />
      </button>
      {canCheck ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={t(done ? 'markNotDone' : 'markDoneNamed', { name: planName(plan) })}
          onClick={onToggleDone}
          className={cn(
            'group/check focus-visible:ring-ring/30 absolute top-1 right-1 flex size-8 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:outline-none max-xl:top-0.5 max-xl:right-0.5 max-xl:size-10',
            moving && 'opacity-40',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'flex size-5 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150',
              done
                ? 'border-accent-foreground bg-accent-foreground text-accent'
                : 'border-foreground-subtle group-hover/check:border-accent group-hover/check:text-accent text-transparent',
            )}
          >
            <Check className="size-3" strokeWidth={3.5} />
          </span>
        </button>
      ) : null}
    </div>
  );
};
