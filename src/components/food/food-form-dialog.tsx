'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { foodsApi, type FoodInput } from '@/lib/api/endpoints';
import type { Food, FoodUnit } from '@/lib/api/types';
import { optionalNumber, positiveNumber, requiredNumber, toValue } from '@/lib/validation/numbers';

const UNIT_VALUES: FoodUnit[] = ['GRAM', 'MILLILITER', 'PIECE', 'SERVING'];

const UNIT_LABEL_KEYS = {
  GRAM: 'grams',
  MILLILITER: 'millilitres',
  PIECE: 'pieces',
  SERVING: 'servings',
} as const;

interface FoodValues {
  name: string;
  brand: string;
  servingSize: number;
  servingUnit: FoodUnit;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface FoodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food?: Food | null;
}

const toDefaults = (food?: Food | null): FoodValues => ({
  name: food?.name ?? '',
  brand: food?.brand ?? '',
  servingSize: food?.servingSize ?? 100,
  servingUnit: food?.servingUnit ?? 'GRAM',
  energyKcal: food?.energyKcal ?? Number.NaN,
  proteinG: food?.proteinG ?? Number.NaN,
  carbsG: food?.carbsG ?? Number.NaN,
  fatG: food?.fatG ?? Number.NaN,
});

export const FoodFormDialog = ({ open, onOpenChange, food }: FoodFormDialogProps) => {
  const t = useTranslations('foodForm');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('nameRequired')),
        brand: z.string().trim().max(120),
        servingSize: positiveNumber(t('servingRequired')),
        servingUnit: z.enum(['GRAM', 'MILLILITER', 'PIECE', 'SERVING']),
        energyKcal: requiredNumber(t('caloriesRequired')),
        proteinG: optionalNumber(t('caloriesRequired')),
        carbsG: optionalNumber(t('caloriesRequired')),
        fatG: optionalNumber(t('caloriesRequired')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FoodValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(food),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaults(food));
    }
  }, [open, food, reset]);

  const save = useMutation({
    mutationFn: (input: FoodInput) =>
      food ? foodsApi.update(food.id, input) : foodsApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast({ title: food ? t('updated') : t('saved') });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      showToast({
        title: t('saveFailed'),
        description: error instanceof ApiError ? error.message : undefined,
        tone: 'danger',
      });
    },
  });

  const servingUnit = watch('servingUnit');
  const unitOptions = UNIT_VALUES.map((value) => ({
    value,
    label: units(UNIT_LABEL_KEYS[value]),
  }));

  const onSubmit = handleSubmit((values) =>
    save.mutate({
      name: values.name,
      brand: values.brand.trim() || null,
      servingSize: values.servingSize,
      servingUnit: values.servingUnit,
      energyKcal: values.energyKcal,
      proteinG: toValue(values.proteinG),
      carbsG: toValue(values.carbsG),
      fatG: toValue(values.fatG),
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={food ? t('editTitle') : t('newTitle')}
      description={t('description')}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label={t('name')} error={errors.name?.message}>
          {(props) => <Input {...props} {...register('name')} autoFocus className="font-sans" />}
        </Field>

        <Field label={t('brand')} optional>
          {(props) => <Input {...props} {...register('brand')} className="font-sans" />}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('servingSize')} error={errors.servingSize?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('servingSize', { valueAsNumber: true })}
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
                value={servingUnit}
                onValueChange={(next) => setValue('servingUnit', next)}
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
          <Field label={t('protein')} error={errors.proteinG?.message}>
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
          <Field label={t('carbs')} error={errors.carbsG?.message}>
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
          <Field label={t('fat')} error={errors.fatG?.message}>
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
          <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
            {save.isPending ? common('saving') : food ? t('saveChanges') : t('saveFood')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
