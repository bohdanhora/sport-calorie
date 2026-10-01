'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bookmark, History, Sparkle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { paceReplacesIntensity } from '@/lib/activity/intensity';
import { ApiError } from '@/lib/api/client';
import {
  activitiesApi,
  nutritionProviderApi,
  plansApi,
  savedExercisesApi,
  type ActivityEstimateInput,
  type ActivityValuesInput,
} from '@/lib/api/endpoints';
import type { ActivityEntry, ActivityType, Intensity, Plan, SavedExercise } from '@/lib/api/types';
import {
  kilometresToMetres,
  metresToKilometres,
  minutesToSeconds,
  secondsToMinutes,
} from '@/lib/format/units';
import { useActivityTypeName } from '@/lib/format/use-activity-name';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import { cn } from '@/lib/utils/cn';
import {
  optionalNumber,
  toDecimal,
  toValue,
  type EmptyOr,
  type Submitted,
} from '@/lib/validation/numbers';

const ESTIMATE_DEBOUNCE_MS = 350;

const SUCCESS_KEYS = { log: 'logged', exercise: 'exerciseSaved', plan: 'planSaved' } as const;
const FAILURE_KEYS = {
  log: 'logFailed',
  exercise: 'exerciseSaveFailed',
  plan: 'planSaveFailed',
} as const;
const INTENSITY_VALUES: Intensity[] = ['LOW', 'MODERATE', 'HIGH'];

interface ActivityValues {
  title: string;
  durationMin: EmptyOr<number>;
  distanceKm: EmptyOr<number>;
  avgSpeedKmh: EmptyOr<number>;
  inclinePercent: EmptyOr<number>;
  sets: EmptyOr<number>;
  reps: EmptyOr<number>;
  energyKcal: EmptyOr<number>;
  notes: string;
}

const EMPTY_VALUES: DefaultValues<ActivityValues> = {
  title: '',
  durationMin: undefined,
  distanceKm: undefined,
  avgSpeedKmh: undefined,
  inclinePercent: undefined,
  sets: Number.NaN,
  reps: Number.NaN,
  energyKcal: Number.NaN,
  notes: '',
};

type DecimalField = 'durationMin' | 'distanceKm' | 'avgSpeedKmh' | 'inclinePercent';

export type ActivityDialogTarget =
  | { kind: 'log' }
  | { kind: 'exercise'; exercise?: SavedExercise }
  | { kind: 'plan'; plan?: Plan; position?: number };

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  preferCategory?: ActivityType['category'];
  target?: ActivityDialogTarget;
}

const LOG_TARGET: ActivityDialogTarget = { kind: 'log' };

const initialOf = (target: ActivityDialogTarget): SavedExercise | undefined =>
  target.kind === 'exercise'
    ? target.exercise
    : target.kind === 'plan'
      ? target.plan?.exercises[0]
      : undefined;

type ActivityTemplate = Pick<
  SavedExercise,
  | 'activityType'
  | 'durationSec'
  | 'distanceM'
  | 'avgSpeedKmh'
  | 'inclinePercent'
  | 'sets'
  | 'reps'
  | 'intensity'
  | 'notes'
  | 'energyKcal'
  | 'energySource'
> & { name: string };

interface QuickPick {
  key: string;
  label: string;
  saved: boolean;
  template: ActivityTemplate;
}

const fromEntry = (entry: ActivityEntry): ActivityTemplate => ({
  ...entry,
  name: entry.title ?? '',
});

const MAX_QUICK_PICKS = 12;

const valuesOf = (exercise: ActivityTemplate): DefaultValues<ActivityValues> => ({
  title: exercise.name,
  durationMin: exercise.durationSec ? secondsToMinutes(exercise.durationSec) : undefined,
  distanceKm: exercise.distanceM ? metresToKilometres(exercise.distanceM) : undefined,
  avgSpeedKmh: exercise.avgSpeedKmh ?? undefined,
  inclinePercent: exercise.inclinePercent ?? undefined,
  sets: exercise.sets ?? Number.NaN,
  reps: exercise.reps ?? Number.NaN,
  energyKcal: exercise.energySource === 'MANUAL' ? exercise.energyKcal : Number.NaN,
  notes: exercise.notes ?? '',
});

const useDebounced = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
};

export const ActivityDialog = ({
  open,
  onOpenChange,
  date,
  preferCategory,
  target = LOG_TARGET,
}: ActivityDialogProps) => {
  const t = useTranslations('activityForm');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const intensityNames = useTranslations('intensity');
  const format = useFormat();
  const activityName = useActivityTypeName();

  const [typeId, setTypeId] = useState<string>('');
  const [intensity, setIntensity] = useState<Intensity>('MODERATE');
  const [overrideEnergy, setOverrideEnergy] = useState(false);
  const [saveAsExercise, setSaveAsExercise] = useState(false);
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const initial = initialOf(target);
  const offersQuickPick = target.kind !== 'exercise' && !initial;
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const typesQuery = useQuery({
    queryKey: queryKeys.activityTypes,
    queryFn: activitiesApi.types,
    enabled: open,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const schema = useMemo(
    () =>
      z.object({
        title:
          target.kind === 'exercise'
            ? z.string().trim().min(1, t('nameRequired')).max(120)
            : z.string().trim().max(120),
        durationMin: optionalNumber(t('durationNegative')),
        distanceKm: optionalNumber(t('distanceNegative')),
        avgSpeedKmh: optionalNumber(t('speedNegative')),
        inclinePercent: optionalNumber(t('inclineNegative')),
        sets: optionalNumber(t('setsNegative')),
        reps: optionalNumber(t('repsNegative')),
        energyKcal: optionalNumber(t('caloriesNegative')),
        notes: z.string().trim().max(280),
      }),
    [t, target.kind],
  );

  const locale = useLocale();
  const [description, setDescription] = useState('');

  const provider = useQuery({
    queryKey: queryKeys.nutritionProvider,
    queryFn: nutritionProviderApi.get,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    resetField,
    setValue,
    formState: { errors },
  } = useForm<ActivityValues, unknown, Submitted<ActivityValues>>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  const applyNumber = (field: DecimalField, value: number | null | undefined): void => {
    if (value === null || value === undefined) {
      resetField(field);
      return;
    }

    setValue(field, value);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(initial ? valuesOf(initial) : EMPTY_VALUES);
    setIntensity(initial?.intensity ?? 'MODERATE');
    setOverrideEnergy(initial?.energySource === 'MANUAL');
    setSaveAsExercise(false);
    setPickedKey(null);
    setDescription('');

    if (initial) {
      setTypeId(initial.activityType.id);
    }
  }, [open, reset, initial]);

  useEffect(() => {
    const types = typesQuery.data;

    if (!open || !types || types.length === 0 || typeId) {
      return;
    }

    const preferred = preferCategory
      ? types.find((type) => type.category === preferCategory)
      : undefined;

    setTypeId((preferred ?? types[0]).id);
  }, [open, typesQuery.data, typeId, preferCategory]);

  const activityType = useMemo(
    () => typesQuery.data?.find((type) => type.id === typeId) ?? null,
    [typesQuery.data, typeId],
  );

  const savedQuery = useQuery({
    queryKey: queryKeys.savedExercises,
    queryFn: savedExercisesApi.list,
    enabled: open && offersQuickPick,
  });

  const recentQuery = useQuery({
    queryKey: queryKeys.recentActivities,
    queryFn: activitiesApi.recent,
    enabled: open && offersQuickPick,
  });

  const quickPicks = useMemo<QuickPick[]>(() => {
    const saved = (savedQuery.data ?? []).map((exercise) => ({
      key: `saved:${exercise.id}`,
      label: exercise.name,
      saved: true,
      template: exercise,
    }));
    const savedLabels = new Set(saved.map((pick) => pick.label.toLowerCase()));
    const recent = (recentQuery.data ?? [])
      .map((entry) => ({
        key: `recent:${entry.id}`,
        label: entry.title ?? activityName(entry.activityType),
        saved: false,
        template: fromEntry(entry),
      }))
      .filter((pick) => !savedLabels.has(pick.label.toLowerCase()));

    return [...saved, ...recent].slice(0, MAX_QUICK_PICKS);
  }, [savedQuery.data, recentQuery.data, activityName]);

  const shortDetail = (template: ActivityTemplate): string =>
    template.distanceM
      ? `${format.distance(template.distanceM)} · `
      : template.durationSec
        ? `${format.duration(template.durationSec)} · `
        : template.reps
          ? `${template.reps}× · `
          : '';

  const applyPick = (pick: QuickPick): void => {
    setPickedKey(pick.key);
    setTypeId(pick.template.activityType.id);
    reset(valuesOf(pick.template));
    setIntensity(pick.template.intensity ?? 'MODERATE');
    setOverrideEnergy(pick.template.energySource === 'MANUAL');
    setSaveAsExercise(false);
  };

  const values = watch();
  const durationMin = toValue(values.durationMin);
  const distanceKm = toValue(values.distanceKm);
  const durationSec = durationMin === null ? null : minutesToSeconds(durationMin);
  const distanceM = distanceKm === null ? null : kilometresToMetres(distanceKm);
  const avgSpeedKmh = toValue(values.avgSpeedKmh);

  const paceKnown = paceReplacesIntensity(activityType?.category ?? null, {
    durationSec,
    distanceM,
    avgSpeedKmh,
  });
  const asksIntensity = Boolean(activityType?.tracksIntensity) && !paceKnown;

  const measurements = useMemo<ActivityEstimateInput | null>(() => {
    if (!activityType) {
      return null;
    }

    return {
      activityTypeId: activityType.id,
      durationSec,
      distanceM,
      avgSpeedKmh,
      inclinePercent: toValue(values.inclinePercent),
      sets: toValue(values.sets),
      reps: toValue(values.reps),
      intensity: asksIntensity ? intensity : null,
      date,
    };
  }, [activityType, durationSec, distanceM, avgSpeedKmh, values, asksIntensity, intensity, date]);

  const debounced = useDebounced(measurements, ESTIMATE_DEBOUNCE_MS);
  const hasMeasurement = Boolean(
    debounced && (debounced.durationSec || debounced.distanceM || debounced.reps),
  );

  const estimateQuery = useQuery({
    queryKey: ['activity-estimate', debounced],
    queryFn: () => activitiesApi.estimate(debounced as ActivityEstimateInput),
    enabled: open && hasMeasurement && !overrideEnergy,
  });

  const submit = useMutation({
    mutationFn: async ({ name, values }: { name: string; values: ActivityValuesInput }) => {
      const activityTypeId = activityType?.id ?? '';

      if (target.kind === 'exercise') {
        const input = { name, activityTypeId, ...values };

        await (target.exercise
          ? savedExercisesApi.update(target.exercise.id, input)
          : savedExercisesApi.create(input));
        return;
      }

      if (target.kind === 'plan') {
        const input = { name: name || null, activityTypeId, ...values };

        await (target.plan
          ? plansApi.update(target.plan.id, input)
          : plansApi.create({ ...input, date, position: target.position }));
        return;
      }

      await activitiesApi.create({ activityTypeId, title: name || null, date, ...values });

      if (saveAsExercise && activityType) {
        await savedExercisesApi.create({
          name: name || activityName(activityType),
          activityTypeId,
          ...values,
        });
      }
    },
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t(SUCCESS_KEYS[target.kind]) });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      showToast({
        title: t(FAILURE_KEYS[target.kind]),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const onSubmit = handleSubmit((formValues) => {
    if (!activityType || !measurements) {
      return;
    }

    submit.mutate({
      name: formValues.title.trim(),
      values: {
        durationSec: measurements.durationSec,
        distanceM: measurements.distanceM,
        avgSpeedKmh: measurements.avgSpeedKmh,
        inclinePercent: measurements.inclinePercent,
        sets: measurements.sets,
        reps: measurements.reps,
        intensity: asksIntensity ? intensity : null,
        energyKcal: overrideEnergy ? toValue(formValues.energyKcal) : null,
        notes: formValues.notes.trim() || null,
      },
    });
  });

  const typeOptions = (typesQuery.data ?? []).map((type) => ({
    value: type.id,
    label: activityName(type),
  }));

  const parse = useMutation({
    mutationFn: () => activitiesApi.parse(description.trim(), locale),
    onSuccess: (parsed) => {
      setTypeId(parsed.activityTypeId);
      setValue('title', parsed.title ?? '');
      applyNumber('durationMin', parsed.durationSec ? secondsToMinutes(parsed.durationSec) : null);
      applyNumber('distanceKm', parsed.distanceM ? metresToKilometres(parsed.distanceM) : null);
      applyNumber('avgSpeedKmh', parsed.avgSpeedKmh);
      applyNumber('inclinePercent', parsed.inclinePercent);
      setValue('sets', parsed.sets ?? Number.NaN);
      setValue('reps', parsed.reps ?? Number.NaN);

      if (parsed.intensity) {
        setIntensity(parsed.intensity);
      }
    },
    onError: (error: unknown) => {
      showToast({
        title: t('parseFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const dialogTitle =
    target.kind === 'exercise'
      ? t(target.exercise ? 'editExercise' : 'newExercise')
      : target.kind === 'plan'
        ? t(target.plan ? 'editPlan' : 'planActivity')
        : t('title');

  const submitLabel =
    target.kind === 'exercise'
      ? common('save')
      : target.kind === 'plan'
        ? t(target.plan ? 'savePlan' : 'addToCalendar')
        : t('title');

  const intensityOptions = INTENSITY_VALUES.map((value) => ({
    value,
    label: intensityNames(value),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={dialogTitle}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {offersQuickPick && quickPicks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-foreground-muted text-[0.8125rem] font-medium">{t('quickPick')}</p>
            <ul className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
              {quickPicks.map((pick) => {
                const picked = pick.key === pickedKey;

                return (
                  <li key={pick.key} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={picked}
                      onClick={() => applyPick(pick)}
                      className={cn(
                        'press focus-visible:ring-ring/30 flex h-11 max-w-60 items-center gap-1.5 rounded-full border px-3.5 text-[0.8125rem] whitespace-nowrap transition-colors duration-150 focus-visible:ring-3 focus-visible:outline-none sm:h-9',
                        picked
                          ? 'border-accent bg-accent text-accent-foreground'
                          : pick.saved
                            ? 'border-accent/30 bg-accent-soft text-foreground hover:border-accent/60'
                            : 'border-border bg-surface text-foreground hover:bg-surface-muted',
                      )}
                    >
                      {pick.saved ? (
                        <Bookmark
                          className={cn('size-3.5 shrink-0', picked ? '' : 'text-accent')}
                          aria-hidden
                        />
                      ) : (
                        <History
                          className={cn(
                            'size-3.5 shrink-0',
                            picked ? '' : 'text-foreground-subtle',
                          )}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 truncate font-medium">{pick.label}</span>
                      <span
                        className={cn(
                          'numeric shrink-0 text-xs',
                          picked ? 'text-accent-foreground/80' : 'text-foreground-subtle',
                        )}
                      >
                        {shortDetail(pick.template)}
                        {format.kcal(pick.template.energyKcal)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {provider.data?.isConfigured ? (
          <div className="border-border bg-surface-muted space-y-2 rounded-md border p-3">
            <div className="flex gap-2">
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('describePlaceholder')}
                aria-label={t('describe')}
                autoComplete="off"
                className="bg-surface font-sans"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && description.trim().length > 1) {
                    event.preventDefault();
                    parse.mutate();
                  }
                }}
              />
              <Button
                type="button"
                className="shrink-0"
                onClick={() => parse.mutate()}
                disabled={parse.isPending || description.trim().length < 2}
              >
                <Sparkle className="size-4" aria-hidden />
                {parse.isPending ? t('parsing') : t('parseDescription')}
              </Button>
            </div>
            <p className="text-foreground-subtle text-xs">{t('describeHint')}</p>
          </div>
        ) : null}

        <Field label={t('activity')}>
          {(props) => (
            <Select
              {...props}
              value={typeId}
              onValueChange={setTypeId}
              options={typeOptions}
              placeholder={t('chooseActivity')}
            />
          )}
        </Field>

        {target.kind === 'exercise' ? (
          <Field
            label={t('exerciseName')}
            error={errors.title?.message}
            hint={t('exerciseNameHint')}
          >
            {(props) => <Input {...props} {...register('title')} className="font-sans" />}
          </Field>
        ) : (
          <Field label={t('label')} optional hint={t('labelHint')}>
            {(props) => <Input {...props} {...register('title')} className="font-sans" />}
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          {activityType?.tracksDuration ? (
            <Field
              label={t('duration')}
              error={errors.durationMin?.message}
              suffix={units('minute')}
            >
              {(props) => (
                <NumberInput
                  {...props}
                  {...register('durationMin', { setValueAs: toDecimal })}
                  className="pr-14"
                />
              )}
            </Field>
          ) : null}

          {activityType?.tracksDistance ? (
            <Field
              label={t('distance')}
              error={errors.distanceKm?.message}
              suffix={units('kilometre')}
            >
              {(props) => (
                <NumberInput
                  {...props}
                  {...register('distanceKm', { setValueAs: toDecimal })}
                  className="pr-12"
                />
              )}
            </Field>
          ) : null}

          {activityType?.tracksDistance ? (
            <Field
              label={t('averageSpeed')}
              error={errors.avgSpeedKmh?.message}
              suffix={units('speed')}
              hint={t('speedHint')}
            >
              {(props) => (
                <NumberInput
                  {...props}
                  {...register('avgSpeedKmh', { setValueAs: toDecimal })}
                  className="pr-20"
                  placeholder={
                    estimateQuery.data?.avgSpeedKmh
                      ? String(estimateQuery.data.avgSpeedKmh)
                      : undefined
                  }
                />
              )}
            </Field>
          ) : null}

          {activityType?.tracksIncline ? (
            <Field
              label={t('incline')}
              error={errors.inclinePercent?.message}
              suffix={units('percent')}
            >
              {(props) => (
                <NumberInput
                  {...props}
                  {...register('inclinePercent', { setValueAs: toDecimal })}
                  className="pr-10"
                />
              )}
            </Field>
          ) : null}

          {activityType?.tracksSets ? (
            <Field label={t('sets')} error={errors.sets?.message}>
              {(props) => (
                <Input
                  {...props}
                  {...register('sets', { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                />
              )}
            </Field>
          ) : null}

          {activityType?.tracksReps ? (
            <Field label={t('reps')} error={errors.reps?.message} hint={t('repsHint')}>
              {(props) => (
                <Input
                  {...props}
                  {...register('reps', { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                />
              )}
            </Field>
          ) : null}
        </div>

        {asksIntensity ? (
          <div className="space-y-1.5">
            <p className="text-foreground-muted text-[0.8125rem] font-medium">{t('intensity')}</p>
            <Segmented
              label={t('intensity')}
              value={intensity}
              onChange={setIntensity}
              options={intensityOptions}
            />
          </div>
        ) : null}

        <div className="border-border bg-surface-muted rounded-md border px-4 py-3">
          {overrideEnergy ? (
            <Field
              label={t('caloriesBurned')}
              error={errors.energyKcal?.message}
              suffix={units('kcal')}
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('energyKcal', { valueAsNumber: true })}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  className="pr-16"
                />
              )}
            </Field>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="label-caps">{t('estimatedBurn')}</p>
                <p className="text-foreground-subtle mt-1 text-xs">
                  {estimateQuery.data?.usedFallbackWeight
                    ? t('fallbackWeightHint')
                    : paceKnown
                      ? t('estimatePaceHint')
                      : t('estimateHint')}
                </p>
              </div>
              <p className="metric-md shrink-0">
                {hasMeasurement && estimateQuery.data
                  ? format.kcal(estimateQuery.data.energyKcal)
                  : '0'}
                <span className="text-foreground-subtle ml-1 text-xs font-normal">
                  {units('kcal')}
                </span>
              </p>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 -ml-2"
            onClick={() => setOverrideEnergy((current) => !current)}
          >
            {overrideEnergy ? t('useEstimate') : t('enterOwn')}
          </Button>
        </div>

        <Field label={t('notes')} optional>
          {(props) => <Textarea {...props} {...register('notes')} className="font-sans" />}
        </Field>

        {target.kind === 'log' ? (
          <label className="border-border hover:bg-surface-muted/60 flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors duration-150">
            <input
              type="checkbox"
              checked={saveAsExercise}
              onChange={(event) => setSaveAsExercise(event.target.checked)}
              className="accent-accent size-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-[0.8125rem] font-medium">{t('saveAsExercise')}</span>
              <span className="text-foreground-subtle block text-xs">
                {t('saveAsExerciseHint')}
              </span>
            </span>
          </label>
        ) : null}

        <div className="bg-surface-raised border-border sticky -bottom-[max(1rem,env(safe-area-inset-bottom))] -mx-5 mt-1 -mb-[max(1rem,env(safe-area-inset-bottom))] border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submit.isPending || !(hasMeasurement || overrideEnergy)}
          >
            {submit.isPending ? common('saving') : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
