'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { weightApi } from '@/lib/api/endpoints';
import { useFormat } from '@/lib/format/use-format';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';
import { requiredNumber } from '@/lib/validation/numbers';

const MIN_WEIGHT_KG = 25;
const MAX_WEIGHT_KG = 400;

interface WeightValues {
  weightKg: number;
  note: string;
}

interface WeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  currentWeightKg?: number | null;
}

export const WeightDialog = ({ open, onOpenChange, date, currentWeightKg }: WeightDialogProps) => {
  const t = useTranslations('weightForm');
  const common = useTranslations('common');
  const units = useTranslations('units');
  const format = useFormat();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const schema = useMemo(
    () =>
      z.object({
        weightKg: requiredNumber(
          t('range', { min: MIN_WEIGHT_KG, max: MAX_WEIGHT_KG }),
          MIN_WEIGHT_KG,
        ).refine((value) => value <= MAX_WEIGHT_KG, t('tooHigh', { max: MAX_WEIGHT_KG })),
        note: z.string().trim().max(280),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WeightValues>({
    resolver: zodResolver(schema),
    defaultValues: { weightKg: Number.NaN, note: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ weightKg: currentWeightKg ?? Number.NaN, note: '' });
    }
  }, [open, currentWeightKg, reset]);

  const save = useMutation({
    mutationFn: (values: WeightValues) =>
      weightApi.upsert(date, values.weightKg, values.note.trim() || null),
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: t('saved') });
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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={format.fullDate(date)}
    >
      <form
        onSubmit={handleSubmit((values) => save.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <Field label={t('weight')} error={errors.weightKg?.message} suffix={units('kilogram')}>
          {(props) => (
            <Input
              {...props}
              {...register('weightKg', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="0.1"
              min={MIN_WEIGHT_KG}
              max={MAX_WEIGHT_KG}
              autoFocus
              className="pr-14"
            />
          )}
        </Field>

        <Field label={t('note')} optional>
          {(props) => (
            <Input
              {...props}
              {...register('note')}
              className="font-sans"
              placeholder={t('notePlaceholder')}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
          {save.isPending ? common('saving') : t('save')}
        </Button>
      </form>
    </Dialog>
  );
};
