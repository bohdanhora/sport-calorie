'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { savedExercisesApi, workoutsApi } from '@/lib/api/endpoints';
import type { SavedExercise, Workout } from '@/lib/api/types';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import { cn } from '@/lib/utils/cn';

interface WorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout?: Workout;
  onCreateExercise: () => void;
}

const move = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);

  next.splice(to, 0, item);

  return next;
};

export const WorkoutDialog = ({
  open,
  onOpenChange,
  workout,
  onCreateExercise,
}: WorkoutDialogProps) => {
  const t = useTranslations('library');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const format = useFormat();
  const activityName = useActivityTypeName();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();

  const exercises = useQuery({
    queryKey: queryKeys.savedExercises,
    queryFn: savedExercisesApi.list,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(workout?.name ?? '');
    setSelected(workout?.exercises.map((exercise) => exercise.id) ?? []);
    setNameError(undefined);
  }, [open, workout]);

  const byId = useMemo(
    () => new Map((exercises.data ?? []).map((exercise) => [exercise.id, exercise])),
    [exercises.data],
  );

  const chosen = selected
    .map((id) => byId.get(id))
    .filter((exercise): exercise is SavedExercise => Boolean(exercise));

  const totalKcal = chosen.reduce((sum, exercise) => sum + exercise.energyKcal, 0);
  const totalSec = chosen.reduce((sum, exercise) => sum + exercise.effectiveDurationSec, 0);

  const save = useMutation({
    mutationFn: () => {
      const input = { name: name.trim(), exerciseIds: selected };

      return workout ? workoutsApi.update(workout.id, input) : workoutsApi.create(input);
    },
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('workoutSaved') });
      onOpenChange(false);
    },
    onError: (error: unknown) =>
      showToast({
        title: t('saveFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      }),
  });

  const toggle = (id: string): void =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const onSubmit = (): void => {
    if (!name.trim()) {
      setNameError(t('nameRequired'));
      return;
    }

    save.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={workout ? t('editWorkout') : t('newWorkout')}
      description={t('workoutDialogHint')}
      className="sm:top-[8dvh] sm:translate-y-0"
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label={t('workoutName')} error={nameError}>
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(undefined);
              }}
              placeholder={t('workoutNamePlaceholder')}
              maxLength={120}
              autoComplete="off"
              className="font-sans"
            />
          )}
        </Field>

        {chosen.length > 0 ? (
          <div className="space-y-2">
            <p className="text-foreground-muted text-[0.8125rem] font-medium">{t('inOrder')}</p>
            <ol className="divide-border border-border bg-surface divide-y overflow-hidden rounded-md border">
              {chosen.map((exercise, index) => (
                <li key={exercise.id} className="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
                  <span className="bg-accent-soft text-accent numeric flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{exercise.name}</span>
                    <span className="numeric text-foreground-subtle block text-xs">
                      {format.kcal(exercise.energyKcal)} {units('kcal')}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('moveUp', { name: exercise.name })}
                    disabled={index === 0}
                    onClick={() => setSelected((current) => move(current, index, index - 1))}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('moveDown', { name: exercise.name })}
                    disabled={index === chosen.length - 1}
                    onClick={() => setSelected((current) => move(current, index, index + 1))}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('takeOut', { name: exercise.name })}
                    onClick={() => toggle(exercise.id)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex min-h-8 items-center justify-between gap-2">
            <p className="text-foreground-muted text-[0.8125rem] font-medium">
              {t('pickExercises')}
            </p>
            <Button variant="ghost" size="sm" className="-mr-2" onClick={onCreateExercise}>
              <Plus className="size-4" aria-hidden />
              {t('newExercise')}
            </Button>
          </div>

          {exercises.data && exercises.data.length === 0 ? (
            <p className="border-border text-foreground-muted rounded-md border border-dashed px-4 py-5 text-center text-[0.8125rem]">
              {t('noExercisesHint')}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {(exercises.data ?? []).map((exercise) => {
                const isChosen = selected.includes(exercise.id);

                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => toggle(exercise.id)}
                      className={cn(
                        'press flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors duration-150',
                        isChosen
                          ? 'border-accent/50 bg-accent-soft'
                          : 'border-border bg-surface hover:bg-surface-muted',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-150',
                          isChosen
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border-strong',
                        )}
                      >
                        {isChosen ? <Check className="size-3.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{exercise.name}</span>
                        {exercise.name !== activityName(exercise.activityType) ? (
                          <span className="text-foreground-subtle block truncate text-xs">
                            {activityName(exercise.activityType)}
                          </span>
                        ) : null}
                      </span>
                      <span className="numeric text-foreground-muted shrink-0 text-xs">
                        {format.kcal(exercise.energyKcal)} {units('kcal')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-surface-raised border-border sticky -bottom-[max(1rem,env(safe-area-inset-bottom))] -mx-5 mt-1 -mb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-4 border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="label-caps">{t('total')}</p>
            <p className="numeric mt-0.5 truncate text-sm">
              <span className="font-medium">{format.kcal(totalKcal)}</span>{' '}
              <span className="text-foreground-subtle text-xs">
                {units('kcal')}
                {totalSec > 0 ? ` · ${format.duration(totalSec)}` : ''}
              </span>
            </p>
          </div>
          <Button type="submit" size="lg" disabled={save.isPending || selected.length === 0}>
            {save.isPending ? common('saving') : common('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
