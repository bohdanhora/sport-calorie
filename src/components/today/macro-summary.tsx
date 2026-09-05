'use client';

import { useTranslations } from 'next-intl';

import { Section } from '@/components/ui/section';
import type { MacroAmount } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';

interface MacroSummaryProps {
  consumed: MacroAmount;
  target: MacroAmount;
}

/** One colour per macro, so the three bars stop reading as one repeated bar. */
const MACROS = [
  { key: 'proteinG', label: 'protein', bar: 'bg-chart-1' },
  { key: 'carbsG', label: 'carbs', bar: 'bg-chart-2' },
  { key: 'fatG', label: 'fat', bar: 'bg-chart-3' },
] as const;

export const MacroSummary = ({ consumed, target }: MacroSummaryProps) => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  return (
    <Section title={t('macros')}>
      <dl className="border-border bg-surface grid grid-cols-3 divide-x divide-[var(--border)] rounded-lg border">
        {MACROS.map(({ key, label, bar }, index) => {
          const eaten = consumed[key];
          const goal = target[key];
          const progress = goal > 0 ? Math.min(eaten / goal, 1) : 0;

          return (
            <div
              key={key}
              className="animate-row space-y-2 px-4 py-3.5"
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
                <div className="bg-surface-muted mt-2.5 h-1.5 overflow-hidden rounded-full" aria-hidden>
                  <div
                    className={`${bar} h-full rounded-full transition-[width] duration-500 ease-out`}
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
