'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

import { FoodCard } from '@/components/food/food-card';
import { FoodEntryDialog } from '@/components/food/food-entry-dialog';
import { FoodFormDialog } from '@/components/food/food-form-dialog';
import { DateHeading, DateNav } from '@/components/layout/date-nav';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { MealList } from '@/components/today/meal-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSelectedDate } from '@/hooks/use-selected-date';
import { foodsApi, summaryApi } from '@/lib/api/endpoints';
import type { Food, MealType } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-provider';
import { useFormat } from '@/lib/format/use-format';
import { queryKeys } from '@/lib/query/query-keys';
import { cn } from '@/lib/utils/cn';

const FoodView = () => {
  const t = useTranslations('foodPage');
  const { timezone } = useAuth();
  const [date, setDate] = useSelectedDate(timezone);
  const [tab, setTab] = useState<'diary' | 'foods'>('diary');
  const [entryDialog, setEntryDialog] = useState<{
    open: boolean;
    meal: MealType;
    food: Food | null;
  }>({ open: false, meal: 'BREAKFAST', food: null });

  const tabs = [
    { value: 'diary' as const, label: t('diary') },
    { value: 'foods' as const, label: t('myFoods') },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{t('title')}</h1>
            <p className="text-foreground-subtle mt-0.5 text-[0.8125rem]">{t('subtitle')}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setEntryDialog({ open: true, meal: 'BREAKFAST', food: null })}
          >
            <Plus className="size-4" aria-hidden />
            {t('logFood')}
          </Button>
        </div>
        <Segmented
          label={t('title')}
          value={tab}
          onChange={setTab}
          options={tabs}
          className="sm:max-w-sm"
        />
      </header>

      {tab === 'diary' ? (
        <DiaryTab
          date={date}
          timezone={timezone}
          onChangeDate={setDate}
          onAdd={(meal) => setEntryDialog({ open: true, meal, food: null })}
        />
      ) : (
        <SavedFoodsTab
          onLogFood={(food) => setEntryDialog({ open: true, meal: 'BREAKFAST', food })}
        />
      )}

      <FoodEntryDialog
        open={entryDialog.open}
        onOpenChange={(open) => setEntryDialog((current) => ({ ...current, open }))}
        date={date}
        defaultMeal={entryDialog.meal}
        defaultFood={entryDialog.food}
      />
    </div>
  );
};

const DiaryTab = ({
  date,
  timezone,
  onChangeDate,
  onAdd,
}: {
  date: string;
  timezone: string;
  onChangeDate: (date: string) => void;
  onAdd: (meal: MealType) => void;
}) => {
  const t = useTranslations('foodPage');
  const units = useTranslations('units');
  const format = useFormat();

  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(date),
    queryFn: () => summaryApi.dashboard(date),
  });

  return (
    <div className="space-y-5">
      <div className="border-border flex items-center justify-between gap-3 border-b pb-3">
        <DateHeading date={date} timezone={timezone} />
        <DateNav date={date} timezone={timezone} onChange={onChangeDate} />
      </div>

      {dashboard.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : dashboard.isError ? (
        <ErrorState onRetry={() => void dashboard.refetch()} />
      ) : (
        <>
          <div className="border-border bg-surface space-y-2.5 rounded-lg border px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="label-caps">{t('consumed')}</span>
              <span className="metric-lg">
                {format.kcal(dashboard.data.calories.consumedKcal)}
                <span className="text-foreground-subtle ml-1 text-xs font-normal">
                  / {format.kcal(dashboard.data.calories.targetKcal)} {units('kcal')}
                </span>
              </span>
            </div>

            <div className="bg-surface-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 ease-out',
                  dashboard.data.calories.remainingKcal < 0 ? 'bg-danger' : 'bg-accent',
                )}
                style={{
                  width: `${
                    Math.min(
                      dashboard.data.calories.consumedKcal /
                        Math.max(dashboard.data.calories.targetKcal, 1),
                      1,
                    ) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          <MealList meals={dashboard.data.meals} onAdd={onAdd} columns />
        </>
      )}
    </div>
  );
};

const SavedFoodsTab = ({ onLogFood }: { onLogFood: (food: Food) => void }) => {
  const t = useTranslations('foodPage');
  const [search, setSearch] = useState('');
  const [formDialog, setFormDialog] = useState<{ open: boolean; food: Food | null }>({
    open: false,
    food: null,
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const foods = useQuery({
    queryKey: queryKeys.foods(search),
    queryFn: () => foodsApi.list(search, 50),
  });

  const archive = useMutation({
    mutationFn: foodsApi.archive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast({ title: t('archived') });
    },
    onError: () => showToast({ title: t('archiveFailed'), tone: 'danger' }),
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="text-foreground-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            autoComplete="off"
            className="pl-9 font-sans"
          />
        </div>
        <Button variant="secondary" onClick={() => setFormDialog({ open: true, food: null })}>
          <Plus className="size-4" aria-hidden />
          {t('newFood')}
        </Button>
      </div>

      <Section title={t('savedFoods')}>
        {foods.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-[8.75rem] w-full" />
            ))}
          </div>
        ) : foods.isError ? (
          <ErrorState onRetry={() => void foods.refetch()} />
        ) : foods.data.items.length === 0 ? (
          <EmptyState
            title={t('noMatches')}
            description={t('noMatchesHint')}
            action={
              <Button size="sm" onClick={() => setFormDialog({ open: true, food: null })}>
                {t('newFood')}
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {foods.data.items.map((food, index) => (
              <FoodCard
                key={food.id}
                food={food}
                index={index}
                archiving={archive.isPending}
                onLog={() => onLogFood(food)}
                onEdit={() => setFormDialog({ open: true, food })}
                onArchive={() => archive.mutate(food.id)}
              />
            ))}
          </ul>
        )}
      </Section>

      <FoodFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((current) => ({ ...current, open }))}
        food={formDialog.food}
      />
    </div>
  );
};

const FoodPage = () => (
  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
    <FoodView />
  </Suspense>
);

export default FoodPage;
