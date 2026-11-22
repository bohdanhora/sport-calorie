import type { DayOverview, FitnessGoal, WeightEntry } from '@/lib/api/types';

export type InsightTone = 'good' | 'neutral' | 'attention';

export type Insight =
  | { kind: 'logging'; tone: InsightTone; logged: number; total: number; streak: number }
  | { kind: 'goal'; tone: InsightTone; logged: number; onTarget: number; over: number }
  | {
      kind: 'pace';
      tone: InsightTone;
      goal: FitnessGoal;
      expectedKgPerWeek: number;
      measuredKgPerWeek: number | null;
    }
  | {
      kind: 'forecast';
      tone: InsightTone;
      currentKg: number;
      targetKg: number;
      kgPerWeek: number;
      weeks: number | null;
    }
  | { kind: 'weekday'; tone: InsightTone; weekday: number; aboveAverageKcal: number }
  | { kind: 'activity'; tone: InsightTone; activeDays: number; perWeek: number };

export interface InsightInput {
  days: DayOverview[];
  weights: Pick<WeightEntry, 'date' | 'weightKg'>[];
  today: string;
  goal: FitnessGoal | null;
  tdeeKcal: number | null;
  targetWeightKg: number | null;
}

const KCAL_PER_KG = 7700;
const MS_PER_DAY = 86_400_000;
const MIN_LOGGED_DAYS = 3;
const TARGET_TOLERANCE = 0.1;
const MIN_WEIGHT_SPAN_DAYS = 7;
const MIN_WEEKDAY_RANGE = 14;
const MIN_WEEKDAY_SAMPLES = 2;
const WEEKDAY_SPREAD = 0.15;
const FORECAST_LIMIT_WEEKS = 104;

const isLogged = (day: DayOverview) => day.foodEntryCount > 0;

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY;

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const allowanceOf = (day: DayOverview) => day.targetKcal + day.activityKcal;

const loggingStreak = (days: DayOverview[], today: string) => {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let index = ordered.length - 1;

  if (ordered[index]?.date === today && !isLogged(ordered[index])) {
    index -= 1;
  }

  let streak = 0;

  while (index >= 0 && isLogged(ordered[index])) {
    streak += 1;
    index -= 1;
  }

  return streak;
};

export const weightTrendPerWeek = (weights: InsightInput['weights']): number | null => {
  if (weights.length < 2) {
    return null;
  }

  const points = weights.map((entry) => ({ x: dayNumber(entry.date), y: entry.weightKg }));
  const span = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));

  if (span < MIN_WEIGHT_SPAN_DAYS) {
    return null;
  }

  const meanX = average(points.map((p) => p.x));
  const meanY = average(points.map((p) => p.y));
  const covariance = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  const variance = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);

  return variance === 0 ? null : (covariance / variance) * 7;
};

const paceTone = (goal: FitnessGoal, kgPerWeek: number): InsightTone => {
  if (goal === 'LOSE_WEIGHT') {
    if (kgPerWeek >= 0) return 'attention';
    if (kgPerWeek < -1) return 'attention';
    return kgPerWeek <= -0.2 ? 'good' : 'neutral';
  }

  if (goal === 'GAIN_WEIGHT') {
    if (kgPerWeek <= 0 || kgPerWeek > 0.6) return 'attention';
    return kgPerWeek >= 0.1 ? 'good' : 'neutral';
  }

  return Math.abs(kgPerWeek) <= 0.25 ? 'good' : 'attention';
};

export const buildInsights = (input: InsightInput): Insight[] => {
  const { days, today } = input;
  const total = days.length;
  const logged = days.filter(isLogged);
  const insights: Insight[] = [];

  if (total === 0) {
    return insights;
  }

  const rate = logged.length / total;

  insights.push({
    kind: 'logging',
    tone: rate >= 0.8 ? 'good' : rate < 0.5 ? 'attention' : 'neutral',
    logged: logged.length,
    total,
    streak: loggingStreak(days, today),
  });

  if (logged.length >= MIN_LOGGED_DAYS) {
    const onTarget = logged.filter(
      (day) => Math.abs(day.consumedKcal - allowanceOf(day)) <= allowanceOf(day) * TARGET_TOLERANCE,
    ).length;
    const over = logged.filter(
      (day) => day.consumedKcal > allowanceOf(day) * (1 + TARGET_TOLERANCE),
    ).length;

    insights.push({
      kind: 'goal',
      tone:
        onTarget / logged.length >= 0.6
          ? 'good'
          : over / logged.length >= 0.4
            ? 'attention'
            : 'neutral',
      logged: logged.length,
      onTarget,
      over,
    });
  }

  const measuredKgPerWeek = weightTrendPerWeek(input.weights);

  if (input.goal && input.tdeeKcal && logged.length >= MIN_LOGGED_DAYS) {
    const dailyBalance = average(
      logged.map((day) => day.consumedKcal - (input.tdeeKcal as number) - day.activityKcal),
    );
    const expectedKgPerWeek = (dailyBalance * 7) / KCAL_PER_KG;

    insights.push({
      kind: 'pace',
      tone: paceTone(input.goal, measuredKgPerWeek ?? expectedKgPerWeek),
      goal: input.goal,
      expectedKgPerWeek,
      measuredKgPerWeek,
    });
  }

  const latestWeight = [...input.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  if (latestWeight && input.targetWeightKg !== null && measuredKgPerWeek !== null) {
    const remaining = input.targetWeightKg - latestWeight.weightKg;
    const towards = remaining !== 0 && Math.sign(remaining) === Math.sign(measuredKgPerWeek);
    const weeks = towards ? Math.abs(remaining / measuredKgPerWeek) : null;

    insights.push({
      kind: 'forecast',
      tone: remaining === 0 ? 'good' : towards ? 'good' : 'attention',
      currentKg: latestWeight.weightKg,
      targetKg: input.targetWeightKg,
      kgPerWeek: measuredKgPerWeek,
      weeks: weeks !== null && weeks <= FORECAST_LIMIT_WEEKS ? Math.ceil(weeks) : null,
    });
  }

  if (total >= MIN_WEEKDAY_RANGE && logged.length >= MIN_WEEKDAY_RANGE / 2) {
    const overall = average(logged.map((day) => day.consumedKcal));
    const byWeekday = new Map<number, number[]>();

    for (const day of logged) {
      const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      byWeekday.set(weekday, [...(byWeekday.get(weekday) ?? []), day.consumedKcal]);
    }

    const peak = [...byWeekday.entries()]
      .filter(([, values]) => values.length >= MIN_WEEKDAY_SAMPLES)
      .map(([weekday, values]) => ({ weekday, mean: average(values) }))
      .sort((a, b) => b.mean - a.mean)[0];

    if (peak && overall > 0 && peak.mean - overall >= overall * WEEKDAY_SPREAD) {
      insights.push({
        kind: 'weekday',
        tone: 'neutral',
        weekday: peak.weekday,
        aboveAverageKcal: Math.round(peak.mean - overall),
      });
    }
  }

  const activeDays = days.filter((day) => day.activityCount > 0).length;
  const perWeek = (activeDays / total) * 7;

  insights.push({
    kind: 'activity',
    tone: perWeek >= 3 ? 'good' : perWeek < 1.5 ? 'attention' : 'neutral',
    activeDays,
    perWeek: Math.round(perWeek * 10) / 10,
  });

  return insights;
};
