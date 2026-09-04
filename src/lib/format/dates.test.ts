import { describe, expect, it } from 'vitest';

import {
  addDays,
  dayOffsetFromToday,
  differenceInDays,
  formatShortDate,
  formatWeekdayDate,
  isFuture,
  todayIn,
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
