'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import {
  activitiesApi,
  nutritionProviderApi,
  type ActivityEstimateInput,
} from '@/lib/api/endpoints';
import type { ActivityType, Intensity } from '@/lib/api/types';
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
import { optionalNumber, toValue } from '@/lib/validation/numbers';

const ESTIMATE_DEBOUNCE_MS = 350;
const INTENSITY_VALUES: Intensity[] = ['LOW', 'MODERATE', 'HIGH'];

interface ActivityValues {
  title: string;
  durationMin: number;
  distanceKm: number;
  avgSpeedKmh: number;
  inclinePercent: number;
  sets: number;
  reps: number;
  energyKcal: number;
  notes: string;
}

const EMPTY_VALUES: ActivityValues = {
  title: '',
  durationMin: Number.NaN,
  distanceKm: Number.NaN,
  avgSpeedKmh: Number.NaN,
  inclinePercent: Number.NaN,
  sets: Number.NaN,
  reps: Number.NaN,
  energyKcal: Number.NaN,
  notes: '',
};

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  preferCategory?: ActivityType['category'];
}

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
        title: z.string().trim().max(120),
        durationMin: optionalNumber(t('durationNegative')),
        distanceKm: optionalNumber(t('distanceNegative')),
        avgSpeedKmh: optionalNumber(t('speedNegative')),
        inclinePercent: optionalNumber(t('inclineNegative')),
        sets: optionalNumber(t('setsNegative')),
        reps: optionalNumber(t('repsNegative')),
        energyKcal: optionalNumber(t('caloriesNegative')),
        notes: z.string().trim().max(280),
      }),
    [t],
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
    setValue,
    formState: { errors },
  } = useForm<ActivityValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(EMPTY_VALUES);
    setIntensity('MODERATE');
    setOverrideEnergy(false);
    setDescription('');
  }, [open, reset]);

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

  const values = watch();
  const measurements = useMemo<ActivityEstimateInput | null>(() => {
    if (!activityType) {
      return null;
    }

    return {
      activityTypeId: activityType.id,
      durationSec: Number.isFinite(values.durationMin)
        ? minutesToSeconds(values.durationMin)
        : null,
      distanceM: Number.isFinite(values.distanceKm) ? kilometresToMetres(values.distanceKm) : null,
      avgSpeedKmh: toValue(values.avgSpeedKmh),
      inclinePercent: toValue(values.inclinePercent),
      sets: toValue(values.sets),
      reps: toValue(values.reps),
      intensity,
      date,
    };
  }, [activityType, values, intensity, date]);

  const debounced = useDebounced(measurements, ESTIMATE_DEBOUNCE_MS);
  const hasMeasurement = Boolean(
    debounced && (debounced.durationSec || debounced.distanceM || debounced.reps),
  );

  const estimateQuery = useQuery({
    queryKey: ['activity-estimate', debounced],
    queryFn: () => activitiesApi.estimate(debounced as ActivityEstimateInput),
    enabled: open && hasMeasurement && !overrideEnergy,
  });

  const createEntry = useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('logged') });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      showToast({
        title: t('logFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const onSubmit = handleSubmit((formValues) => {
    if (!activityType || !measurements) {
      return;
    }

    createEntry.mutate({
      activityTypeId: activityType.id,
      title: formValues.title.trim() || null,
      durationSec: measurements.durationSec,
      distanceM: measurements.distanceM,
      avgSpeedKmh: measurements.avgSpeedKmh,
      inclinePercent: measurements.inclinePercent,
      sets: measurements.sets,
      reps: measurements.reps,
      intensity: activityType.tracksIntensity ? intensity : null,
      energyKcal: overrideEnergy ? toValue(formValues.energyKcal) : null,
      notes: formValues.notes.trim() || null,
      date,
    });
  });

  const typeOptions = (typesQuery.data ?? []).map((type) => ({
    value: type.id,
    label: activityName(type),
  }));

  const parse = useMutation({
    mutationFn: () => activitiesApi.parse(description.trim(), locale),
    onSuccess: (parsed) => {
      // The API answers in seconds and metres; the form is minutes and km.
      setTypeId(parsed.activityTypeId);
      setValue('title', parsed.title ?? '');
      setValue('durationMin', parsed.durationSec ? secondsToMinutes(parsed.durationSec) : Number.NaN);
      setValue('distanceKm', parsed.distanceM ? metresToKilometres(parsed.distanceM) : Number.NaN);
      setValue('avgSpeedKmh', parsed.avgSpeedKmh ?? Number.NaN);
      setValue('inclinePercent', parsed.inclinePercent ?? Number.NaN);
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

  const intensityOptions = INTENSITY_VALUES.map((value) => ({
    value,
    label: intensityNames(value),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('title')}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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

        <Field label={t('label')} optional hint={t('labelHint')}>
          {(props) => <Input {...props} {...register('title')} className="font-sans" />}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          {activityType?.tracksDuration ? (
            <Field
              label={t('duration')}
              error={errors.durationMin?.message}
              suffix={units('minute')}
            >
              {(props) => (
                <Input
                  {...props}
                  {...register('durationMin', { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
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
                <Input
                  {...props}
                  {...register('distanceKm', { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
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
                <Input
                  {...props}
                  {...register('avgSpeedKmh', { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
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
                <Input
                  {...props}
                  {...register('inclinePercent', { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
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

        {activityType?.tracksIntensity ? (
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

        <div className="bg-surface-raised border-border sticky bottom-0 -mx-5 mt-1 border-t px-5 pt-3 pb-1">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={createEntry.isPending || !hasMeasurement}
          >
            {createEntry.isPending ? common('saving') : t('title')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
