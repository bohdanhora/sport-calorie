import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  buildMonthGrid,
  dayOffsetFromToday,
  differenceInDays,
  formatShortDate,
  formatWeekdayDate,
  isFuture,
  isSameMonth,
  startOfMonth,
  todayIn,
  weekStartsOnFor,
} from './dates';

const NOW = new Date('2026-03-01T22:30:00.000Z');

describe('todayIn', () => {
  it('reads the calendar day of the given timezone, not the browser one', () => {
    expect(todayIn('Europe/Kyiv', NOW)).toBe('2026-03-02');
    expect(todayIn('UTC', NOW)).toBe('2026-03-01');
    expect(todayIn('America/New_York', NOW)).toBe('2026-03-01');
  });
});

describe('date arithmetic', () => {
  it('moves across month boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('measures whole days', () => {
    expect(differenceInDays('2026-03-01', '2026-03-08')).toBe(7);
  });
});

describe('dayOffsetFromToday', () => {
  it('places days around today in the profile timezone', () => {
    expect(dayOffsetFromToday('2026-03-01', 'UTC', NOW)).toBe(0);
    expect(dayOffsetFromToday('2026-02-28', 'UTC', NOW)).toBe(-1);
    expect(dayOffsetFromToday('2026-03-02', 'UTC', NOW)).toBe(1);
  });

  it('follows the profile timezone, not the browser', () => {
    expect(dayOffsetFromToday('2026-03-02', 'Europe/Kyiv', NOW)).toBe(0);
  });
});

describe('date formatting', () => {
  it('formats in the requested locale', () => {
    expect(formatShortDate('2026-02-24', 'en-US')).toBe('Feb 24');
    expect(formatWeekdayDate('2026-02-24', 'en-US')).toBe('Tue, Feb 24');
    expect(formatShortDate('2026-02-24', 'uk-UA')).toContain('24');
  });
});

describe('isFuture', () => {
  it('knows which days cannot be logged yet', () => {
    expect(isFuture('2026-03-02', 'UTC', NOW)).toBe(true);
    expect(isFuture('2026-03-01', 'UTC', NOW)).toBe(false);
    expect(isFuture('2026-03-02', 'Europe/Kyiv', NOW)).toBe(false);
  });
});

describe('addMonths', () => {
  it('keeps the day of the month when the target month is long enough', () => {
    expect(addMonths('2026-03-15', 1)).toBe('2026-04-15');
    expect(addMonths('2026-03-15', -1)).toBe('2026-02-15');
  });

  it('clamps to the last day when the target month is shorter', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-05-31', -1)).toBe('2026-04-30');
  });

  it('crosses the year boundary', () => {
    expect(addMonths('2026-12-10', 1)).toBe('2027-01-10');
    expect(addMonths('2026-01-10', -1)).toBe('2025-12-10');
  });
});

describe('buildMonthGrid', () => {
  it('always returns six full weeks so the grid keeps its height', () => {
    expect(buildMonthGrid('2026-02-10', 1)).toHaveLength(42);
    expect(buildMonthGrid('2026-08-01', 0)).toHaveLength(42);
  });

  it('starts on the weekday the locale asks for', () => {
    // 1 March 2026 is a Sunday.
    expect(buildMonthGrid('2026-03-15', 0)[0]).toBe('2026-03-01');
    expect(buildMonthGrid('2026-03-15', 1)[0]).toBe('2026-02-23');
  });

  it('pads with the neighbouring months and contains every day of its own', () => {
    const grid = buildMonthGrid('2026-04-15', 1);

    expect(grid[0]).toBe('2026-03-30');
    expect(grid.at(-1)).toBe('2026-05-10');
    expect(grid.filter((day) => day.startsWith('2026-04'))).toHaveLength(30);
  });
});

describe('month helpers', () => {
  it('finds the first of the month', () => {
    expect(startOfMonth('2026-07-19')).toBe('2026-07-01');
  });

  it('compares months without comparing days', () => {
    expect(isSameMonth('2026-07-01', '2026-07-31')).toBe(true);
    expect(isSameMonth('2026-07-31', '2026-08-01')).toBe(false);
  });

  it('starts the week on Sunday only for english', () => {
    expect(weekStartsOnFor('en')).toBe(0);
    expect(weekStartsOnFor('ru')).toBe(1);
    expect(weekStartsOnFor('uk')).toBe(1);
  });
});
