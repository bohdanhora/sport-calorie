'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { describeActivity } from '@/components/today/activity-list';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { savedExercisesApi, workoutsApi } from '@/lib/api/endpoints';
import type { SavedExercise, Workout } from '@/lib/api/types';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';

const MAX_STAGGER_STEPS = 6;
const STAGGER_MS = 30;

const EmptyLibrary = ({
  title,
  hint,
  action,
  onAction,
}: {
  title: string;
  hint: string;
  action: string;
  onAction: () => void;
}) => (
  <div className="border-border rounded-lg border border-dashed px-5 py-7 text-center">
    <p className="text-sm font-medium">{title}</p>
    <p className="text-foreground-muted mx-auto mt-1 max-w-xs text-[0.8125rem] leading-relaxed">
      {hint}
    </p>
    <Button size="sm" className="mt-4" onClick={onAction}>
      <Plus className="size-4" aria-hidden />
      {action}
    </Button>
  </div>
);

interface WorkoutsSectionProps {
  date: string;
  onCreate: () => void;
  onEdit: (workout: Workout) => void;
}

export const WorkoutsSection = ({ date, onCreate, onEdit }: WorkoutsSectionProps) => {
  const t = useTranslations('library');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const format = useFormat();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const workouts = useQuery({ queryKey: queryKeys.workouts, queryFn: workoutsApi.list });

  const logWorkout = useMutation({
    mutationFn: (workout: Workout) => workoutsApi.log(workout.id, date),
    onSuccess: async (entries, workout) => {
      await invalidateDay();
      showToast({
        title: t('workoutLogged', { name: workout.name }),
        description: t('burnedValue', {
          value: format.kcal(entries.reduce((sum, entry) => sum + entry.energyKcal, 0)),
        }),
      });
    },
    onError: () => showToast({ title: t('logFailed'), tone: 'danger' }),
  });

  const removeWorkout = useMutation({
    mutationFn: (workout: Workout) => workoutsApi.remove(workout.id),
    onSuccess: async (_, workout) => {
      await invalidateDay();
      showToast({ title: t('workoutRemoved', { name: workout.name }) });
    },
    onError: () => showToast({ title: t('removeFailed'), tone: 'danger' }),
  });

  return (
    <Section
      title={t('workouts')}
      action={
        workouts.data && workouts.data.length > 0 ? (
          <Button variant="ghost" size="sm" className="-mr-2" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            {common('new')}
          </Button>
        ) : null
      }
    >
      {workouts.isPending ? (
        <Skeleton className="h-36 w-full" />
      ) : !workouts.data || workouts.data.length === 0 ? (
        <EmptyLibrary
          title={t('noWorkouts')}
          hint={t('noWorkoutsHint')}
          action={t('newWorkout')}
          onAction={onCreate}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {workouts.data.map((workout, index) => (
            <li
              key={workout.id}
              className="animate-row border-border bg-surface flex flex-col rounded-lg border px-4 pt-3.5 pb-3"
              style={{ animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{workout.name}</p>
                  <p className="numeric text-foreground-subtle mt-0.5 text-xs">
                    {t('exerciseCount', { count: workout.exercises.length })}
                    {workout.durationSec > 0 ? ` · ${format.duration(workout.durationSec)}` : ''}
                  </p>
                </div>
                <p className="numeric shrink-0 text-right">
                  <span className="metric-md">{format.kcal(workout.energyKcal)}</span>
                  <span className="text-foreground-subtle ml-1 text-xs">{units('kcal')}</span>
                </p>
              </div>

              {workout.exercises.length > 0 ? (
                <ol className="border-border mt-3 space-y-1 border-t pt-2.5">
                  {workout.exercises.map((exercise, position) => (
                    <li
                      key={`${exercise.id}-${position}`}
                      className="flex items-baseline gap-2 text-[0.8125rem]"
                    >
                      <span className="numeric text-foreground-subtle w-4 shrink-0 text-xs">
                        {position + 1}
                      </span>
                      <span className="text-foreground-muted min-w-0 flex-1 truncate">
                        {exercise.name}
                      </span>
                      <span className="numeric text-foreground-subtle shrink-0 text-xs">
                        {format.kcal(exercise.energyKcal)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-foreground-subtle border-border mt-3 border-t pt-2.5 text-xs">
                  {t('workoutEmpty')}
                </p>
              )}

              <div className="mt-3 flex items-center gap-1">
                <Button
                  size="sm"
                  className="mr-auto"
                  disabled={workout.exercises.length === 0 || logWorkout.isPending}
                  onClick={() => logWorkout.mutate(workout)}
                >
                  <Play className="size-3.5" aria-hidden />
                  {t('logWorkout')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('editNamed', { name: workout.name })}
                  onClick={() => onEdit(workout)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('removeNamed', { name: workout.name })}
                  disabled={removeWorkout.isPending}
                  onClick={() => removeWorkout.mutate(workout)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

interface ExercisesSectionProps {
  date: string;
  onCreate: () => void;
  onEdit: (exercise: SavedExercise) => void;
}

export const ExercisesSection = ({ date, onCreate, onEdit }: ExercisesSectionProps) => {
  const t = useTranslations('library');
  const common = useTranslations('common');
  const form = useTranslations('activityForm');
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const exercises = useQuery({
    queryKey: queryKeys.savedExercises,
    queryFn: savedExercisesApi.list,
  });

  const logExercise = useMutation({
    mutationFn: (exercise: SavedExercise) => savedExercisesApi.log(exercise.id, date),
    onSuccess: async (entry, exercise) => {
      await invalidateDay();
      showToast({
        title: t('exerciseLogged', { name: exercise.name }),
        description: t('burnedValue', { value: format.kcal(entry.energyKcal) }),
      });
    },
    onError: () => showToast({ title: t('logFailed'), tone: 'danger' }),
  });

  const removeExercise = useMutation({
    mutationFn: (exercise: SavedExercise) => savedExercisesApi.remove(exercise.id),
    onSuccess: async (_, exercise) => {
      await invalidateDay();
      showToast({ title: t('exerciseRemoved', { name: exercise.name }) });
    },
    onError: () => showToast({ title: t('removeFailed'), tone: 'danger' }),
  });

  return (
    <Section
      title={t('exercises')}
      action={
        exercises.data && exercises.data.length > 0 ? (
          <Button variant="ghost" size="sm" className="-mr-2" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            {common('new')}
          </Button>
        ) : null
      }
    >
      {exercises.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : !exercises.data || exercises.data.length === 0 ? (
        <EmptyLibrary
          title={t('noExercises')}
          hint={t('noExercisesHint')}
          action={t('newExercise')}
          onAction={onCreate}
        />
      ) : (
        <ul className="divide-border border-border bg-surface divide-y overflow-hidden rounded-lg border">
          {exercises.data.map((exercise, index) => {
            const details = describeActivity(exercise, format, form);

            return (
              <li
                key={exercise.id}
                className="group animate-row hover:bg-surface-muted/60 flex items-center gap-2 py-2.5 pr-2 pl-4 transition-colors duration-150"
                style={{ animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {exercise.name}
                    {exercise.name !== activityName(exercise.activityType) ? (
                      <span className="text-foreground-subtle">
                        {' '}
                        · {activityName(exercise.activityType)}
                      </span>
                    ) : null}
                  </p>
                  <p className="numeric text-foreground-subtle mt-0.5 truncate text-xs">
                    {details ? `${details} · ` : ''}
                    {format.kcal(exercise.energyKcal)} {units('kcal')}
                  </p>
                </div>

                <div className="flex shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('editNamed', { name: exercise.name })}
                    onClick={() => onEdit(exercise)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('removeNamed', { name: exercise.name })}
                    disabled={removeExercise.isPending}
                    onClick={() => removeExercise.mutate(exercise)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  aria-label={t('logNamed', { name: exercise.name })}
                  disabled={logExercise.isPending}
                  onClick={() => logExercise.mutate(exercise)}
                >
                  <Plus className="size-4" aria-hidden />
                  {t('log')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
};
