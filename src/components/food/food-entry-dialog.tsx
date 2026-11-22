'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, ChevronLeft, Images, ScanSearch, Search, Sparkle, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { foodEntriesApi, foodsApi, nutritionProviderApi } from '@/lib/api/endpoints';
import type { Food, FoodUnit, MealType, ParsedFood } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';
import { downscaleImage } from '@/lib/media/downscale-image';
import { canLogInUnit, previewPortion } from '@/lib/nutrition/portion';
import { queryKeys } from '@/lib/query/query-keys';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import {
  optionalNumber,
  positiveNumber,
  requiredNumber,
  toDecimal,
  toValue,
  type EmptyOr,
  type Submitted,
} from '@/lib/validation/numbers';

const MAX_PHOTOS = 4;

const MEAL_VALUES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const UNIT_VALUES: FoodUnit[] = ['GRAM', 'MILLILITER', 'PIECE', 'SERVING'];

const UNIT_LABEL_KEYS = {
  GRAM: 'grams',
  MILLILITER: 'millilitres',
  PIECE: 'pieces',
  SERVING: 'servings',
} as const;

const UNIT_SHORT_KEYS = {
  GRAM: 'gram',
  MILLILITER: 'millilitre',
  PIECE: 'piece',
  SERVING: 'serving',
} as const;

interface StagedPhoto {
  id: string;
  file: File;
  preview: string;
}

interface UnitOption {
  value: FoodUnit;
  label: string;
}

interface FoodEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  defaultMeal?: MealType;
  defaultFood?: Food | null;
}

export const FoodEntryDialog = ({
  open,
  onOpenChange,
  date,
  defaultMeal = 'BREAKFAST',
  defaultFood = null,
}: FoodEntryDialogProps) => {
  const t = useTranslations('foodEntry');
  const page = useTranslations('foodPage');
  const mealNames = useTranslations('meals');
  const units = useTranslations('units');
  const locale = useLocale();
  const format = useFormat();

  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [search, setSearch] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [manual, setManual] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [photoNote, setPhotoNote] = useState('');
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const photosRef = useRef<StagedPhoto[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview));
    },
    [],
  );

  const clearPhotos = useCallback(() => {
    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.preview));
      return [];
    });
    setPhotoNote('');
  }, []);

  useEffect(() => {
    if (open) {
      setMeal(defaultMeal);
      setSearch('');
      setDescription('');
      setSelected(defaultFood);
      setManual(false);
      setNotice(null);
      clearPhotos();
    }
  }, [open, defaultMeal, defaultFood, clearPhotos]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const provider = useQuery({
    queryKey: queryKeys.nutritionProvider,
    queryFn: nutritionProviderApi.get,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const recentQuery = useQuery({
    queryKey: queryKeys.recentFoods,
    queryFn: () => foodsApi.recent(8),
    enabled: open,
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.foods(search),
    queryFn: () => foodsApi.list(search, 25),
    enabled: open && search.trim().length > 0,
  });

  const results = search.trim() ? (searchQuery.data?.items ?? []) : (recentQuery.data ?? []);
  const isLoadingList = search.trim() ? searchQuery.isPending : recentQuery.isPending;

  const applyEstimate = useCallback(
    (parsed: ParsedFood) => {
      setSelected({
        id: parsed.foodId,
        name: parsed.name,
        brand: null,
        servingSize: parsed.amount,
        servingUnit: parsed.unit,
        energyKcal: parsed.energyKcal,
        proteinG: parsed.proteinG,
        carbsG: parsed.carbsG,
        fatG: parsed.fatG,
        source: 'EXTERNAL',
        isOwned: true,
        lastUsedAt: null,
        usageCount: 0,
      });
      setNotice(parsed.fromCache ? t('estimateFromCache') : t('estimateReady'));
    },
    [t],
  );

  const reportEstimateFailure = useCallback(
    (error: unknown) => {
      showToast({
        title: t('estimateFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
    [showToast, t],
  );

  const estimate = useMutation({
    mutationFn: () => foodEntriesApi.parse(description.trim(), locale),
    onSuccess: applyEstimate,
    onError: reportEstimateFailure,
  });

  const scan = useMutation({
    mutationFn: async (files: File[]) =>
      foodEntriesApi.scan({
        images: await Promise.all(files.map(downscaleImage)),
        hint: photoNote.trim() || description.trim() || undefined,
        locale,
      }),
    onSuccess: (parsed) => {
      clearPhotos();
      applyEstimate(parsed);
    },
    onError: reportEstimateFailure,
  });

  const onPhotoChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    setPhotos((current) => [
      ...current,
      ...files.slice(0, MAX_PHOTOS - current.length).map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);

    if (photos.length + files.length > MAX_PHOTOS) {
      showToast({ title: t('photoLimit', { count: MAX_PHOTOS }), tone: 'danger' });
    }
  };

  const removePhoto = (id: string) =>
    setPhotos((current) =>
      current.filter((photo) => {
        if (photo.id === id) {
          URL.revokeObjectURL(photo.preview);
        }

        return photo.id !== id;
      }),
    );

  const canAddPhoto = photos.length < MAX_PHOTOS && !scan.isPending;

  const createEntry = useMutation({
    mutationFn: foodEntriesApi.create,
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

  const mealOptions = MEAL_VALUES.map((value) => ({ value, label: mealNames(value) }));
  const unitOptions: UnitOption[] = UNIT_VALUES.map((value) => ({
    value,
    label: units(UNIT_LABEL_KEYS[value]),
  }));

  const title = selected ? selected.name : manual ? t('oneOffTitle') : t('addTitle');
  const subtitle = selected
    ? `${selected.servingSize} ${units(UNIT_SHORT_KEYS[selected.servingUnit])}`
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={subtitle}>
      <div className="space-y-5">
        <Segmented label={t('meal')} value={meal} onChange={setMeal} options={mealOptions} />

        {selected ? (
          <SavedFoodForm
            food={selected}
            notice={notice}
            unitOptions={unitOptions}
            onBack={() => {
              setSelected(null);
              setNotice(null);
            }}
            pending={createEntry.isPending}
            onSubmit={(values) =>
              createEntry.mutate({
                foodId: selected.id,
                meal,
                amount: values.amount,
                unit: values.unit,
                date,
              })
            }
          />
        ) : manual ? (
          <ManualFoodForm
            unitOptions={unitOptions}
            onBack={() => setManual(false)}
            pending={createEntry.isPending}
            onSubmit={(values) =>
              createEntry.mutate({
                name: values.name,
                meal,
                amount: values.amount,
                unit: values.unit,
                energyKcal: values.energyKcal,
                proteinG: toValue(values.proteinG),
                carbsG: toValue(values.carbsG),
                fatG: toValue(values.fatG),
                date,
              })
            }
          />
        ) : (
          <div className="space-y-4">
            {provider.data?.isConfigured ? (
              <div className="border-border bg-surface-muted space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t('describePlaceholder')}
                    aria-label={t('describe')}
                    autoComplete="off"
                    className="bg-surface min-w-40 flex-1 font-sans"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && description.trim().length > 1) {
                        event.preventDefault();
                        estimate.mutate();
                      }
                    }}
                  />
                  <Button
                    className="shrink-0"
                    onClick={() => estimate.mutate()}
                    disabled={estimate.isPending || description.trim().length < 2}
                  >
                    <Sparkle className="size-4" aria-hidden />
                    {estimate.isPending ? t('estimating') : t('estimateNutrition')}
                  </Button>

                  {provider.data?.supportsVision ? (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-11 shrink-0 sm:size-10"
                        aria-label={t('scanPhoto')}
                        title={t('scanPhoto')}
                        disabled={!canAddPhoto}
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Camera className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-11 shrink-0 sm:size-10"
                        aria-label={t('pickPhoto')}
                        title={t('pickPhoto')}
                        disabled={!canAddPhoto}
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <Images className="size-4" aria-hidden />
                      </Button>
                    </>
                  ) : null}
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  hidden
                  onChange={onPhotoChosen}
                />

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  hidden
                  onChange={onPhotoChosen}
                />

                {photos.length > 0 ? (
                  <div className="border-border space-y-2 border-t pt-3">
                    <p className="label-caps">
                      {t('photosStaged', { count: photos.length, max: MAX_PHOTOS })}
                    </p>
                    <ul className="grid grid-cols-4 gap-2">
                      {photos.map((photo, index) => (
                        <li key={photo.id} className="relative aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.preview}
                            alt={t('photoAlt', { index: index + 1 })}
                            className="border-border size-full rounded-md border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            disabled={scan.isPending}
                            aria-label={t('removePhoto', { index: index + 1 })}
                            title={t('removePhoto', { index: index + 1 })}
                            className="press group absolute top-0 right-0 flex size-10 items-start justify-end p-1 disabled:opacity-50"
                          >
                            <span className="bg-surface border-border-strong text-foreground group-hover:bg-surface-muted flex size-6 items-center justify-center rounded-md border">
                              <X className="size-3.5" aria-hidden />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Input
                      value={photoNote}
                      onChange={(event) => setPhotoNote(event.target.value)}
                      placeholder={t('photoNotePlaceholder')}
                      aria-label={t('photoNote')}
                      autoComplete="off"
                      maxLength={500}
                      disabled={scan.isPending}
                      className="bg-surface font-sans"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          scan.mutate(photos.map((photo) => photo.file));
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={scan.isPending}
                        onClick={() => scan.mutate(photos.map((photo) => photo.file))}
                      >
                        <ScanSearch className="size-4" aria-hidden />
                        {scan.isPending ? t('scanning') : t('scanPhotos')}
                      </Button>
                      <Button variant="secondary" disabled={scan.isPending} onClick={clearPhotos}>
                        {t('clearPhotos')}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <p className="text-foreground-subtle text-xs">
                  {scan.isPending
                    ? t('scanning')
                    : provider.data?.supportsVision
                      ? t('estimateOrPhotoHint')
                      : t('estimateHint')}
                </p>

                {provider.data?.isConfigured && !provider.data.supportsVision ? (
                  <p className="text-foreground-subtle text-xs">{t('photoUnavailable')}</p>
                ) : null}
              </div>
            ) : null}

            <div className="relative">
              <Search
                className="text-foreground-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={page('searchPlaceholder')}
                aria-label={page('searchPlaceholder')}
                autoComplete="off"
                className="pl-9 font-sans"
              />
            </div>

            {!search.trim() && results.length > 0 ? (
              <p className="label-caps">{t('recent')}</p>
            ) : null}

            {isLoadingList ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                title={search.trim() ? page('noMatches') : t('noSavedFoods')}
                description={search.trim() ? t('noMatchHint') : t('noSavedFoodsHint')}
              />
            ) : (
              <ul className="divide-border border-border divide-y overflow-hidden rounded-lg border">
                {results.map((food, index) => (
                  <li
                    key={food.id}
                    className="animate-row"
                    style={{ animationDelay: `${Math.min(index, 6) * 25}ms` }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(food)}
                      className="press hover:bg-surface-muted flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{food.name}</span>
                        <span className="text-foreground-subtle mt-0.5 block text-xs">
                          {page('perServing', {
                            kcal: format.kcal(food.energyKcal),
                            serving: `${food.servingSize} ${units(UNIT_SHORT_KEYS[food.servingUnit])}`,
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Button variant="secondary" className="w-full" onClick={() => setManual(true)}>
              {t('manualEntry')}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
};

const SavedFoodForm = ({
  food,
  notice,
  unitOptions,
  onBack,
  onSubmit,
  pending,
}: {
  food: Food;
  notice: string | null;
  unitOptions: UnitOption[];
  onBack: () => void;
  onSubmit: (values: { amount: number; unit: FoodUnit }) => void;
  pending: boolean;
}) => {
  const t = useTranslations('foodEntry');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const format = useFormat();

  const schema = useMemo(
    () =>
      z.object({
        amount: positiveNumber(t('amountPositive')),
        unit: z.enum(['GRAM', 'MILLILITER', 'PIECE', 'SERVING']),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<
    { amount: EmptyOr<number>; unit: FoodUnit },
    unknown,
    { amount: number; unit: FoodUnit }
  >({
    resolver: zodResolver(schema),
    defaultValues: { amount: food.servingSize, unit: food.servingUnit },
  });

  const amount = watch('amount');
  const unit = watch('unit');
  const preview = useMemo(
    () => previewPortion(food, Number(amount) || 0, unit),
    [food, amount, unit],
  );

  const allowedUnits = unitOptions.filter((option) => canLogInUnit(food, option.value));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {notice ? (
        <p className="bg-accent-soft text-accent-ink animate-row rounded-md px-3 py-2 text-xs">
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('amount')} error={errors.amount?.message}>
          {(props) => (
            <NumberInput {...props} {...register('amount', { setValueAs: toDecimal })} autoFocus />
          )}
        </Field>

        <Field label={t('unit')}>
          {(props) => (
            <Select
              {...props}
              value={unit}
              onValueChange={(next) => setValue('unit', next)}
              options={allowedUnits}
            />
          )}
        </Field>
      </div>

      <div className="bg-surface-muted flex items-baseline justify-between rounded-md px-4 py-3">
        <span className="label-caps">{t('adds')}</span>
        <span className="metric-md">
          {preview ? format.kcal(preview.energyKcal) : '0'}
          <span className="text-foreground-subtle ml-1 text-xs font-normal">{units('kcal')}</span>
        </span>
      </div>

      <div className="bg-surface-raised border-border sticky -bottom-[max(1rem,env(safe-area-inset-bottom))] -mx-5 mt-1 -mb-[max(1rem,env(safe-area-inset-bottom))] border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onBack} aria-label={t('backToList')}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? common('saving') : t('addToDiary')}
          </Button>
        </div>
      </div>
    </form>
  );
};

interface ManualValues {
  name: string;
  amount: EmptyOr<number>;
  unit: FoodUnit;
  energyKcal: EmptyOr<number>;
  proteinG: EmptyOr<number>;
  carbsG: EmptyOr<number>;
  fatG: EmptyOr<number>;
}

const ManualFoodForm = ({
  unitOptions,
  onBack,
  onSubmit,
  pending,
}: {
  unitOptions: UnitOption[];
  onBack: () => void;
  onSubmit: (values: Submitted<ManualValues>) => void;
  pending: boolean;
}) => {
  const t = useTranslations('foodEntry');
  const common = useTranslations('common');
  const today = useTranslations('today');
  const units = useTranslations('units');

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('nameRequired')),
        amount: positiveNumber(t('amountPositive')),
        unit: z.enum(['GRAM', 'MILLILITER', 'PIECE', 'SERVING']),
        energyKcal: requiredNumber(t('caloriesRequired')),
        proteinG: optionalNumber(t('proteinNegative')),
        carbsG: optionalNumber(t('carbsNegative')),
        fatG: optionalNumber(t('fatNegative')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ManualValues, unknown, Submitted<ManualValues>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      amount: 100,
      unit: 'GRAM',
      energyKcal: Number.NaN,
      proteinG: undefined,
      carbsG: undefined,
      fatG: undefined,
    },
  });

  const unit = watch('unit');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label={t('name')} error={errors.name?.message}>
        {(props) => <Input {...props} {...register('name')} autoFocus className="font-sans" />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('amount')} error={errors.amount?.message}>
          {(props) => <NumberInput {...props} {...register('amount', { setValueAs: toDecimal })} />}
        </Field>

        <Field label={t('unit')}>
          {(props) => (
            <Select
              {...props}
              value={unit}
              onValueChange={(next) => setValue('unit', next)}
              options={unitOptions}
            />
          )}
        </Field>
      </div>

      <Field label={t('calories')} error={errors.energyKcal?.message} suffix={units('kcal')}>
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

      <fieldset className="grid grid-cols-3 gap-3">
        <legend className="label-caps mb-2">{t('macrosOptional')}</legend>
        <Field label={today('protein')} error={errors.proteinG?.message}>
          {(props) => (
            <NumberInput {...props} {...register('proteinG', { setValueAs: toDecimal })} />
          )}
        </Field>
        <Field label={today('carbs')} error={errors.carbsG?.message}>
          {(props) => <NumberInput {...props} {...register('carbsG', { setValueAs: toDecimal })} />}
        </Field>
        <Field label={today('fat')} error={errors.fatG?.message}>
          {(props) => <NumberInput {...props} {...register('fatG', { setValueAs: toDecimal })} />}
        </Field>
      </fieldset>

      <div className="bg-surface-raised border-border sticky -bottom-[max(1rem,env(safe-area-inset-bottom))] -mx-5 mt-1 -mb-[max(1rem,env(safe-area-inset-bottom))] border-t px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onBack} aria-label={t('backToList')}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? common('saving') : t('addToDiary')}
          </Button>
        </div>
      </div>
    </form>
  );
};
