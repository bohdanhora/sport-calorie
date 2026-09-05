'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, Sparkle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { foodEntriesApi, foodsApi, nutritionProviderApi } from '@/lib/api/endpoints';
import type { Food, FoodUnit, MealType } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';
import { canLogInUnit, previewPortion } from '@/lib/nutrition/portion';
import { queryKeys } from '@/lib/query/query-keys';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import { optionalNumber, positiveNumber, requiredNumber, toValue } from '@/lib/validation/numbers';

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

interface UnitOption {
  value: FoodUnit;
  label: string;
}

interface FoodEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  defaultMeal?: MealType;
  /** Opens straight on the portion form for a food chosen elsewhere. */
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
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setMeal(defaultMeal);
      setSearch('');
      setDescription('');
      setSelected(defaultFood);
      setManual(false);
      setNotice(null);
    }
  }, [open, defaultMeal, defaultFood]);

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

  const estimate = useMutation({
    mutationFn: () => foodEntriesApi.parse(description.trim(), locale),
    onSuccess: (parsed) => {
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
    onError: (error: unknown) => {
      showToast({
        title: t('estimateFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

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
                </div>
                <p className="text-foreground-subtle text-xs">{t('estimateHint')}</p>
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
  } = useForm<{ amount: number; unit: FoodUnit }>({
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
        <p className="bg-accent-soft text-accent animate-row rounded-md px-3 py-2 text-xs">
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('amount')} error={errors.amount?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('amount', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              autoFocus
            />
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

      <div className="bg-surface-raised border-border sticky bottom-0 -mx-5 mt-1 border-t px-5 pt-3 pb-1">
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
  amount: number;
  unit: FoodUnit;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const ManualFoodForm = ({
  unitOptions,
  onBack,
  onSubmit,
  pending,
}: {
  unitOptions: UnitOption[];
  onBack: () => void;
  onSubmit: (values: ManualValues) => void;
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
  } = useForm<ManualValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      amount: 100,
      unit: 'GRAM',
      energyKcal: Number.NaN,
      proteinG: Number.NaN,
      carbsG: Number.NaN,
      fatG: Number.NaN,
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
          {(props) => (
            <Input
              {...props}
              {...register('amount', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
            />
          )}
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
            <Input
              {...props}
              {...register('proteinG', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
            />
          )}
        </Field>
        <Field label={today('carbs')} error={errors.carbsG?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('carbsG', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
            />
          )}
        </Field>
        <Field label={today('fat')} error={errors.fatG?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('fatG', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
            />
          )}
        </Field>
      </fieldset>

      <div className="bg-surface-raised border-border sticky bottom-0 -mx-5 mt-1 border-t px-5 pt-3 pb-1">
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
