'use client';

import { useMutation } from '@tanstack/react-query';
import { Dumbbell, PencilLine, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';

import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { plansApi, type PlanInput } from '@/lib/api/endpoints';
import type { SavedExercise, Workout } from '@/lib/api/types';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';

interface AddToDayDialogProps {
  date: string | null;
  workouts: Workout[];
  exercises: SavedExercise[];
  onOpenChange: (open: boolean) => void;
  onCustom: (date: string) => void;
}

const OptionRow = ({
  icon,
  title,
  meta,
  kcal,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
  kcal?: string;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <li>
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="press border-border bg-surface hover:bg-surface-muted focus-visible:ring-ring/30 flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-150 focus-visible:ring-3 focus-visible:outline-none disabled:opacity-50"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{title}</span>
        {meta ? (
          <span className="text-foreground-subtle block truncate text-xs">{meta}</span>
        ) : null}
      </span>
      {kcal ? <span className="numeric text-foreground-muted shrink-0 text-xs">{kcal}</span> : null}
      <Plus className="text-foreground-subtle size-4 shrink-0" aria-hidden />
    </button>
  </li>
);

export const AddToDayDialog = ({
  date,
  workouts,
  exercises,
  onOpenChange,
  onCustom,
}: AddToDayDialogProps) => {
  const t = useTranslations('calendar');
  const library = useTranslations('library');
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  useEffect(() => {
    if (date) {
      setSearch('');
    }
  }, [date]);

  const add = useMutation({
    mutationFn: (input: PlanInput) => plansApi.create(input),
    onSuccess: async (plan) => {
      await invalidateDay();
      showToast({ title: t('planned', { name: plan.name }) });
      onOpenChange(false);
    },
    onError: () => showToast({ title: t('saveFailed'), tone: 'danger' }),
  });

  const [search, setSearch] = useState('');

  const kcal = (value: number): string => `${format.kcal(value)} ${units('kcal')}`;

  const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string): boolean =>
    tokens.every((token) => text.toLowerCase().includes(token));
  const shownWorkouts = workouts.filter((workout) =>
    matches([workout.name, ...workout.exercises.map((exercise) => exercise.name)].join(' ')),
  );
  const shownExercises = exercises.filter((exercise) =>
    matches(`${exercise.name} ${activityName(exercise.activityType)}`),
  );
  const nothingFound =
    tokens.length > 0 && shownWorkouts.length === 0 && shownExercises.length === 0;

  return (
    <Dialog
      open={date !== null}
      onOpenChange={onOpenChange}
      title={t('addTitle')}
      description={date ? format.fullDate(date) : undefined}
      className="sm:top-[8dvh] sm:translate-y-0"
    >
      {date ? (
        <div className="space-y-5">
          {workouts.length + exercises.length > 0 ? (
            <div className="relative">
              <Search
                className="text-foreground-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('searchLibrary')}
                aria-label={t('searchLibrary')}
                autoComplete="off"
                spellCheck={false}
                className="pl-9 font-sans [&::-webkit-search-cancel-button]:appearance-none"
              />
            </div>
          ) : null}

          {nothingFound ? (
            <p className="text-foreground-subtle py-4 text-center text-[0.8125rem]">
              {t('nothingFound')}
            </p>
          ) : null}

          {shownWorkouts.length > 0 ? (
            <section className="space-y-2">
              <h3 className="label-caps">{library('workouts')}</h3>
              <ul className="space-y-1.5">
                {shownWorkouts.map((workout) => (
                  <OptionRow
                    key={workout.id}
                    icon={<Dumbbell className="text-accent size-4 shrink-0" aria-hidden />}
                    title={workout.name}
                    meta={library('exerciseCount', { count: workout.exercises.length })}
                    kcal={kcal(workout.energyKcal)}
                    disabled={add.isPending || workout.exercises.length === 0}
                    onClick={() => add.mutate({ date, workoutId: workout.id })}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {shownExercises.length > 0 ? (
            <section className="space-y-2">
              <h3 className="label-caps">{library('exercises')}</h3>
              <ul className="space-y-1.5">
                {shownExercises.map((exercise) => (
                  <OptionRow
                    key={exercise.id}
                    icon={
                      <span
                        aria-hidden
                        className="bg-border-strong mx-1.5 size-1.5 shrink-0 rounded-full"
                      />
                    }
                    title={exercise.name}
                    meta={
                      exercise.name === activityName(exercise.activityType)
                        ? undefined
                        : activityName(exercise.activityType)
                    }
                    kcal={kcal(exercise.energyKcal)}
                    disabled={add.isPending}
                    onClick={() => add.mutate({ date, exerciseId: exercise.id })}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="label-caps">{t('other')}</h3>
            <ul>
              <OptionRow
                icon={<PencilLine className="text-foreground-subtle size-4 shrink-0" aria-hidden />}
                title={t('oneOff')}
                meta={t('oneOffHint')}
                onClick={() => onCustom(date)}
              />
            </ul>
          </section>
        </div>
      ) : null}
    </Dialog>
  );
};
