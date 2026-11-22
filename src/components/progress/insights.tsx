'use client';

import { useTranslations } from 'next-intl';

import type { Insight, InsightTone } from '@/lib/insights/build-insights';
import { addDays } from '@/lib/format/dates';
import { useFormat } from '@/lib/format/use-format';
import { cn } from '@/lib/utils/cn';

const TONE_CLASSES: Record<InsightTone, string> = {
  good: 'bg-accent-soft text-accent-ink',
  neutral: 'bg-surface-muted text-foreground-muted',
  attention: 'bg-warning/15 text-warning',
};

const DOT_CLASSES: Record<InsightTone, string> = {
  good: 'bg-accent-ink',
  neutral: 'bg-foreground-subtle',
  attention: 'bg-warning',
};

const REFERENCE_SUNDAY = Date.UTC(2026, 10, 1);

const paceVariant = (insight: Extract<Insight, { kind: 'pace' }>) => {
  const kg = insight.measuredKgPerWeek ?? insight.expectedKgPerWeek;

  if (insight.goal === 'LOSE_WEIGHT') {
    if (kg >= 0) return 'loseUp';
    if (kg < -1) return 'loseFast';
    return insight.tone === 'good' ? 'loseGood' : 'loseSlow';
  }

  if (insight.goal === 'GAIN_WEIGHT') {
    if (kg <= 0) return 'gainShort';
    if (kg > 0.6) return 'gainFast';
    return 'gainGood';
  }

  return insight.tone === 'good' ? 'maintainGood' : 'maintainDrift';
};

const tipKey = (insight: Insight) => {
  switch (insight.kind) {
    case 'logging':
      return insight.tone === 'good' ? 'loggingTipGood' : 'loggingTip';
    case 'goal':
      return insight.tone === 'good'
        ? 'goalTipGood'
        : insight.over >= insight.logged - insight.onTarget - insight.over
          ? 'goalTipOver'
          : 'goalTipUnder';
    case 'pace':
      return `paceTip.${paceVariant(insight)}`;
    case 'forecast':
      return null;
    case 'weekday':
      return 'weekdayTip';
    case 'activity':
      return insight.tone === 'good' ? 'activityTipGood' : 'activityTip';
  }
};

interface InsightsProps {
  insights: Insight[];
  today: string;
}

export const Insights = ({ insights, today }: InsightsProps) => {
  const t = useTranslations('progress.insights');
  const format = useFormat();

  const weekdayName = (weekday: number) => {
    const name = new Intl.DateTimeFormat(format.locale, {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(new Date(REFERENCE_SUNDAY + weekday * 86_400_000));

    return name.charAt(0).toLocaleUpperCase(format.locale) + name.slice(1);
  };

  const body = (insight: Insight): string[] => {
    switch (insight.kind) {
      case 'logging':
        return [t('logging', insight)];
      case 'goal':
        return [t('goal', insight)];
      case 'pace':
        return [
          t('paceExpected', { kg: format.signedWeight(insight.expectedKgPerWeek) }),
          ...(insight.measuredKgPerWeek !== null
            ? [t('paceMeasured', { kg: format.signedWeight(insight.measuredKgPerWeek) })]
            : []),
        ];
      case 'forecast': {
        if (insight.currentKg === insight.targetKg) {
          return [t('forecastDone')];
        }

        const lines = [
          t('forecast', {
            current: format.weight(insight.currentKg),
            target: format.weight(insight.targetKg),
            kg: format.signedWeight(insight.kgPerWeek),
          }),
        ];

        if (insight.tone === 'attention') {
          lines.push(t('forecastAway'));
        } else if (insight.weeks === null) {
          lines.push(t('forecastFar'));
        } else {
          lines.push(
            t('forecastWeeks', {
              weeks: insight.weeks,
              date: format.dateWithYear(addDays(today, insight.weeks * 7)),
            }),
          );
        }

        return lines;
      }
      case 'weekday':
        return [
          t('weekday', {
            weekday: weekdayName(insight.weekday),
            kcal: format.kcal(insight.aboveAverageKcal),
          }),
        ];
      case 'activity':
        return [
          t('activity', {
            activeDays: insight.activeDays,
            perWeek: format.decimal(insight.perWeek),
          }),
        ];
    }
  };

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {insights.map((insight, index) => {
        const tip = tipKey(insight);

        return (
          <li
            key={insight.kind}
            className="border-border bg-surface animate-row flex flex-col gap-2.5 rounded-lg border px-4 py-3.5"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{t(`${insight.kind}Title`)}</h3>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  TONE_CLASSES[insight.tone],
                )}
              >
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', DOT_CLASSES[insight.tone])}
                />
                {t(`tone.${insight.tone}`)}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              {body(insight).map((line) => (
                <p key={line} className="numeric">
                  {line}
                </p>
              ))}
            </div>
            {tip ? <p className="text-foreground-muted text-xs leading-relaxed">{t(tip)}</p> : null}
          </li>
        );
      })}
    </ul>
  );
};
