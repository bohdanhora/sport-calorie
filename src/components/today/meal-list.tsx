'use client';

import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { useToast } from '@/components/ui/toast';
import { foodEntriesApi } from '@/lib/api/endpoints';
import type { FoodEntry, MealSummary, MealType } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';
import { useInvalidateDay } from '@/lib/query/use-day-mutations';

interface MealListProps {
  meals: MealSummary[];
  onAdd: (meal: MealType) => void;
  /** In a wide column the four meals read better side by side than stacked. */
  columns?: boolean;
}

// Below xl both variants render the same single panel; only the wide breakpoint
// splits it into separate cards.
const PANEL_CLASS = 'border-border bg-surface overflow-hidden rounded-lg border';
const GRID_PANEL_CLASS = `${PANEL_CLASS} xl:grid xl:grid-cols-2 xl:gap-4 xl:overflow-visible xl:rounded-none xl:border-0 xl:bg-transparent`;
const GRID_MEAL_CLASS =
  'xl:border-border xl:overflow-hidden xl:rounded-lg xl:border xl:border-t-0 xl:bg-surface';

/** One colour per meal, so the four headers stop looking interchangeable. */
const MEAL_BARS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4'] as const;

export const MealList = ({ meals, onAdd, columns = false }: MealListProps) => {
  const t = useTranslations('today');
  const entryText = useTranslations('foodEntry');
  const mealNames = useTranslations('meals');
  const units = useTranslations('units');
  const format = useFormat();
  const invalidateDay = useInvalidateDay();
  const { showToast } = useToast();

  const removeEntry = useMutation({
    mutationFn: foodEntriesApi.remove,
    onSuccess: async () => {
      await invalidateDay();
      showToast({ title: entryText('removed') });
    },
    onError: () => showToast({ title: entryText('removeFailed'), tone: 'danger' }),
  });

  const total = meals.reduce((sum, meal) => sum + meal.energyKcal, 0);
  const isEmpty = meals.every((meal) => meal.entries.length === 0);

  return (
    <Section
      title={t('food')}
      action={
        total > 0 ? (
          <span className="numeric text-foreground-subtle text-xs">
            {format.kcal(total)} {units('kcal')}
          </span>
        ) : null
      }
    >
      {isEmpty ? (
        <div
          className={cn(
            'border-border rounded-lg border border-dashed px-5 py-7 text-center',
            columns ? 'mx-auto max-w-2xl' : undefined,
          )}
        >
          <p className="text-sm font-medium">{t('noFood')}</p>
          <p className="text-foreground-muted mt-1 text-[0.8125rem]">{t('noFoodHint')}</p>
          <Button size="sm" className="mt-4" onClick={() => onAdd('BREAKFAST')}>
            {t('addFood')}
          </Button>
        </div>
      ) : (
        <div className={columns ? GRID_PANEL_CLASS : PANEL_CLASS}>
          {meals.map((meal, index) => (
            <div
              key={meal.meal}
              className={cn(
                index > 0 ? 'border-border border-t' : undefined,
                columns ? GRID_MEAL_CLASS : undefined,
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <h3 className="text-[0.8125rem] font-medium">{mealNames(meal.meal)}</h3>
                <div className="flex items-center gap-1">
                  {meal.energyKcal > 0 ? (
                    <span className="numeric text-foreground-muted text-[0.8125rem]">
                      {format.kcal(meal.energyKcal)}
                    </span>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('addFoodTo', { meal: mealNames(meal.meal) })}
                    onClick={() => onAdd(meal.meal)}
                  >
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>

              {total > 0 ? (
                <div
                  className="bg-surface-muted mx-4 mb-2.5 h-1 overflow-hidden rounded-full"
                  aria-hidden
                >
                  <div
                    className={cn('h-full rounded-full', MEAL_BARS[index % MEAL_BARS.length])}
                    style={{ width: `${(meal.energyKcal / total) * 100}%` }}
                  />
                </div>
              ) : null}

              {meal.entries.length > 0 ? (
                <ul className="border-border border-t">
                  {meal.entries.map((entry, entryIndex) => (
                    <FoodEntryRow
                      key={entry.id}
                      entry={entry}
                      index={entryIndex}
                      onRemove={() => removeEntry.mutate(entry.id)}
                      disabled={removeEntry.isPending}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

const FoodEntryRow = ({
  entry,
  index,
  onRemove,
  disabled,
}: {
  entry: FoodEntry;
  index: number;
  onRemove: () => void;
  disabled: boolean;
}) => {
  const t = useTranslations('foodEntry');
  const today = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  const unitLabels: Record<FoodEntry['unit'], string> = {
    GRAM: units('gram'),
    MILLILITER: units('millilitre'),
    PIECE: units('piece'),
    SERVING: units('serving'),
  };

  return (
    <li
      className="group animate-row hover:bg-surface-muted/60 flex items-center gap-3 px-4 py-2.5 pl-5 transition-colors duration-150"
      style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{entry.name}</p>
        <p className="numeric text-foreground-subtle mt-0.5 text-xs">
          {entry.amount} {unitLabels[entry.unit]}
          {entry.proteinG !== null
            ? ` · ${Math.round(entry.proteinG)} ${units('gram')} ${today('proteinInline')}`
            : ''}
        </p>
      </div>

      <span className="numeric text-sm">{format.kcal(entry.energyKcal)}</span>

      <Button
        variant="ghost"
        size="icon"
        aria-label={t('removeEntry', { name: entry.name })}
        disabled={disabled}
        onClick={onRemove}
        className="text-foreground-subtle opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
};
