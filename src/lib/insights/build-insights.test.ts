import { describe, expect, it } from 'vitest';

import type { DayOverview } from '@/lib/api/types';

import { buildInsights, type Insight, weightTrendPerWeek } from './build-insights';

const day = (date: string, consumedKcal: number, activityKcal = 0): DayOverview => ({
  date,
  consumedKcal,
  activityKcal,
  targetKcal: 2000,
  netKcal: consumedKcal - activityKcal,
  walkingDistanceM: 0,
  walkingDurationSec: 0,
  activityCount: activityKcal > 0 ? 1 : 0,
  foodEntryCount: consumedKcal > 0 ? 2 : 0,
  weightKg: null,
});

const range = (start: string, values: [number, number?][]) =>
  values.map(([kcal, activity], index) => {
    const date = new Date(Date.parse(`${start}T00:00:00Z`) + index * 86_400_000)
      .toISOString()
      .slice(0, 10);

    return day(date, kcal, activity);
  });

const find = <K extends Insight['kind']>(insights: Insight[], kind: K) =>
  insights.find((insight) => insight.kind === kind) as Extract<Insight, { kind: K }> | undefined;

const base = { weights: [], goal: null, tdeeKcal: null, targetWeightKg: null };

describe('buildInsights', () => {
  it('counts logged days and the streak, skipping an empty today', () => {
    const days = range('2026-11-01', [[1800], [0], [1900], [2100], [2000], [0]]);
    const logging = find(buildInsights({ ...base, days, today: '2026-11-06' }), 'logging');

    expect(logging).toMatchObject({ logged: 4, total: 6, streak: 3, tone: 'neutral' });
  });

  it('compares each logged day with its goal plus activity', () => {
    const days = range('2026-11-01', [[2000], [2600, 300], [3000], [1500]]);
    const goal = find(buildInsights({ ...base, days, today: '2026-11-04' }), 'goal');

    expect(goal).toMatchObject({ logged: 4, onTarget: 1, over: 2 });
  });

  it('turns the average energy balance into an expected weekly change', () => {
    const days = range('2026-11-01', [[2000], [2000], [2000]]);
    const pace = find(
      buildInsights({ ...base, days, today: '2026-11-03', goal: 'LOSE_WEIGHT', tdeeKcal: 2550 }),
      'pace',
    );

    expect(pace?.expectedKgPerWeek).toBeCloseTo(-0.5, 2);
    expect(pace?.tone).toBe('good');
  });

  it('flags a surplus while losing weight', () => {
    const days = range('2026-11-01', [[2800], [2800], [2800]]);
    const pace = find(
      buildInsights({ ...base, days, today: '2026-11-03', goal: 'LOSE_WEIGHT', tdeeKcal: 2400 }),
      'pace',
    );

    expect(pace?.tone).toBe('attention');
  });

  it('forecasts the weeks left to the target weight from the measured trend', () => {
    const weights = [
      { date: '2026-11-01', weightKg: 82 },
      { date: '2026-11-08', weightKg: 81.5 },
      { date: '2026-11-15', weightKg: 81 },
    ];
    const days = range(
      '2026-11-01',
      Array.from({ length: 15 }, () => [2000] as [number]),
    );
    const forecast = find(
      buildInsights({ ...base, days, weights, today: '2026-11-15', targetWeightKg: 78 }),
      'forecast',
    );

    expect(forecast).toMatchObject({ currentKg: 81, targetKg: 78, weeks: 6, tone: 'good' });
  });

  it('names the weekday with clearly higher intake', () => {
    const values = Array.from({ length: 28 }, (_, index) =>
      index % 7 === 6 ? ([3200] as [number]) : ([2000] as [number]),
    );
    const days = range('2026-11-02', values);
    const weekday = find(buildInsights({ ...base, days, today: '2026-11-29' }), 'weekday');

    expect(weekday?.weekday).toBe(0);
    expect(weekday?.aboveAverageKcal).toBeGreaterThan(900);
  });

  it('reports active days per week', () => {
    const days = range('2026-11-01', [
      [2000, 200],
      [2000],
      [2000, 300],
      [2000],
      [2000],
      [2000],
      [2000],
    ]);
    const activity = find(buildInsights({ ...base, days, today: '2026-11-07' }), 'activity');

    expect(activity).toMatchObject({ activeDays: 2, perWeek: 2, tone: 'neutral' });
  });
});

describe('weightTrendPerWeek', () => {
  it('needs at least a week between weigh-ins', () => {
    expect(
      weightTrendPerWeek([
        { date: '2026-11-01', weightKg: 80 },
        { date: '2026-11-03', weightKg: 79 },
      ]),
    ).toBeNull();
  });
});
