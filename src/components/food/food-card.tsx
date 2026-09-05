'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { Food, FoodUnit } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';

const MACROS = [
  { key: 'proteinG', label: 'protein' },
  { key: 'carbsG', label: 'carbs' },
  { key: 'fatG', label: 'fat' },
] as const;

const UNIT_SHORT_KEYS = {
  GRAM: 'gram',
  MILLILITER: 'millilitre',
  PIECE: 'piece',
  SERVING: 'serving',
} as const;

const MAX_STAGGER_STEPS = 11;
const STAGGER_MS = 30;

interface FoodCardProps {
  food: Food;
  index: number;
  onLog: () => void;
  onEdit: () => void;
  onArchive: () => void;
  archiving: boolean;
}

export const FoodCard = ({ food, index, onLog, onEdit, onArchive, archiving }: FoodCardProps) => {
  const t = useTranslations('foodPage');
  const macroNames = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  const serving = `${food.servingSize} ${units(UNIT_SHORT_KEYS[food.servingUnit as FoodUnit])}`;

  return (
    <li
      className="group animate-row relative"
      style={{ animationDelay: `${Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS}ms` }}
    >
      <button
        type="button"
        onClick={onLog}
        aria-label={t('logThisFood', { name: food.name })}
        className="press border-border bg-surface hover:border-border-strong focus-visible:outline-ring flex h-full w-full flex-col rounded-lg border px-4 py-3 text-left hover:-translate-y-px hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:py-3.5"
      >
        <div className="flex w-full items-start justify-between gap-2 sm:min-h-9">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{food.name}</p>
            <p className="text-foreground-subtle mt-0.5 truncate text-xs">
              {food.brand ?? t('perServingShort', { serving })}
            </p>
          </div>

          {food.isOwned ? (
            <span className="bg-accent-soft text-accent shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] leading-5 transition-opacity duration-150 group-hover:opacity-0 max-sm:group-hover:opacity-100">
              {t('mine')}
            </span>
          ) : null}
        </div>

        <p className="numeric mt-2 flex items-baseline gap-1.5 sm:mt-3">
          <span className="metric-lg">{format.kcal(food.energyKcal)}</span>
          <span className="text-foreground-subtle text-xs">
            {units('kcal')}
            {food.brand ? ` · ${t('perServingShort', { serving })}` : ''}
          </span>
        </p>

        <dl className="border-border mt-2.5 grid w-full grid-cols-3 gap-2 border-t pt-2.5 sm:mt-3 sm:pt-3">
          {MACROS.map(({ key, label }) => (
            <div key={key} className="min-w-0">
              <dt className="label-caps truncate">{macroNames(label)}</dt>
              <dd className="numeric text-foreground-muted mt-1 text-[0.8125rem]">
                {food[key] === null ? '-' : format.grams(food[key])}
              </dd>
            </div>
          ))}
        </dl>
      </button>

      {food.isOwned ? (
        <div className="absolute top-2.5 right-2.5 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('editFood', { name: food.name })}
            onClick={onEdit}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('archiveFood', { name: food.name })}
            disabled={archiving}
            onClick={onArchive}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
    </li>
  );
};
