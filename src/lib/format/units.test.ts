import { describe, expect, it } from 'vitest';

import {
  formatDistance,
  formatDuration,
  formatKcal,
  formatSignedKcal,
  formatSignedWeight,
  formatSpeed,
  formatWeight,
  kilometresToMetres,
  minutesToSeconds,
} from './units';

describe('formatKcal', () => {
  it('shows whole kilocalories with thousands separators', () => {
    expect(formatKcal(1650)).toBe('1,650');
    expect(formatKcal(1650.4)).toBe('1,650');
    expect(formatKcal(0)).toBe('0');
  });
});

describe('formatSignedKcal', () => {
  it('marks a surplus and leaves a deficit negative', () => {
    expect(formatSignedKcal(320)).toBe('+320');
    expect(formatSignedKcal(-770)).toBe('-770');
    expect(formatSignedKcal(0)).toBe('0');
  });
});

describe('localised output', () => {
  it('uses the separators of the requested locale', () => {
    expect(formatKcal(1650, 'ru-RU')).toMatch(/1.650/);
    expect(formatWeight(80.4, 'uk-UA')).toBe('80,4');
  });

  it('uses translated unit labels', () => {
    const labels = {
      metre: 'м',
      kilometre: 'км',
      gram: 'г',
      minute: 'хв',
      hour: 'год',
      second: 'с',
      speed: 'км/год',
    };

    expect(formatDistance(3700, 'uk-UA', labels)).toBe('3,7 км');
    expect(formatDuration(4800, labels)).toBe('1 год 20 хв');
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(0)).toBe('0 m');
  });

  it('uses kilometres with human precision above a kilometre', () => {
    expect(formatDistance(3700)).toBe('3.7 km');
    expect(formatDistance(3749)).toBe('3.7 km');
    expect(formatDistance(12000)).toBe('12 km');
  });
});

describe('formatDuration', () => {
  it('reads naturally at every scale', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(2700)).toBe('45 min');
    expect(formatDuration(4800)).toBe('1 h 20 min');
    expect(formatDuration(7200)).toBe('2 h');
  });
});

describe('weight and speed', () => {
  it('keeps one decimal and never invents precision', () => {
    expect(formatWeight(80.42)).toBe('80.4');
    expect(formatWeight(80)).toBe('80.0');
    expect(formatSignedWeight(-1.5)).toBe('-1.5');
    expect(formatSignedWeight(0.8)).toBe('+0.8');
    expect(formatSpeed(4.93)).toBe('4.9 km/h');
  });
});

describe('input conversions', () => {
  it('converts the units forms collect into the units the API stores', () => {
    expect(minutesToSeconds(45)).toBe(2700);
    expect(kilometresToMetres(3.7)).toBe(3700);
  });
});
