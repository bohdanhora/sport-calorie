'use client';

import { useTranslations } from 'next-intl';

import { Section } from '@/components/ui/section';
import type { MacroAmount } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';

interface MacroSummaryProps {
  consumed: MacroAmount;
  target: MacroAmount;
}

const MACROS = [
  { key: 'proteinG', label: 'protein' },
  { key: 'carbsG', label: 'carbs' },
  { key: 'fatG', label: 'fat' },
] as const;

export const MacroSummary = ({ consumed, target }: MacroSummaryProps) => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  return (
    <Section title={t('macros')}>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
        {MACROS.map(({ key, label }, index) => {
          const eaten = consumed[key];
          const goal = target[key];
          const progress = goal > 0 ? Math.min(eaten / goal, 1) : 0;

          return (
            <div
              key={key}
              className="animate-row space-y-2"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <dt className="label-caps">{t(label)}</dt>
              <dd>
                <p className="metric-md">
                  {format.kcal(eaten)}
                  <span className="text-foreground-subtle ml-1 text-xs font-normal">
                    / {format.kcal(goal)} {units('gram')}
                  </span>
                </p>
                <div className="bg-surface-muted mt-2 h-1 overflow-hidden rounded-full" aria-hidden>
                  <div
                    className="bg-accent h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </Section>
  );
};
