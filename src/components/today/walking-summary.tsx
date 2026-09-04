'use client';

import { useTranslations } from 'next-intl';

import { Section } from '@/components/ui/section';
import type { WalkingSummary as WalkingSummaryData } from '@/lib/api/types';
import { useFormat } from '@/lib/format/use-format';

interface WalkingSummaryProps {
  walking: WalkingSummaryData;
}

export const WalkingSummary = ({ walking }: WalkingSummaryProps) => {
  const t = useTranslations('today');
  const units = useTranslations('units');
  const format = useFormat();

  if (walking.sessions === 0) {
    return null;
  }

  const values = [
    { key: 'distance', label: t('distance'), value: format.distance(walking.distanceM) },
    { key: 'time', label: t('time'), value: format.duration(walking.durationSec) },
    ...(walking.avgSpeedKmh !== null
      ? [
          {
            key: 'speed',
            label: t('averageSpeed'),
            value: format.speed(walking.avgSpeedKmh),
          },
        ]
      : []),
    {
      key: 'burned',
      label: t('burned'),
      value: `${format.kcal(walking.energyKcal)} ${units('kcal')}`,
    },
  ];

  return (
    <Section
      title={t('walking')}
      action={
        <span className="text-foreground-subtle text-xs">
          {t('sessions', { count: walking.sessions })}
        </span>
      }
    >
      <dl className="border-border bg-surface grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border px-4 py-4 sm:grid-cols-4">
        {values.map(({ key, label, value }, index) => (
          <div key={key} className="animate-row" style={{ animationDelay: `${index * 40}ms` }}>
            <dt className="label-caps">{label}</dt>
            <dd className="metric-md mt-1.5">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
};
