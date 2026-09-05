import { describe, expect, it } from 'vitest';

import { paceReplacesIntensity } from './intensity';

const walk = (input: Partial<Parameters<typeof paceReplacesIntensity>[1]>) =>
  paceReplacesIntensity('WALKING', {
    durationSec: null,
    distanceM: null,
    avgSpeedKmh: null,
    ...input,
  });

describe('paceReplacesIntensity', () => {
  it('takes over once duration and distance give a speed', () => {
    expect(walk({ durationSec: 900, distanceM: 1250 })).toBe(true);
  });

  it('takes over on a pace entered by hand', () => {
    expect(walk({ avgSpeedKmh: 5 })).toBe(true);
  });

  it('leaves the question standing when only the duration is known', () => {
    expect(walk({ durationSec: 900 })).toBe(false);
  });

  it('leaves the question standing when only the distance is known', () => {
    expect(walk({ distanceM: 1250 })).toBe(false);
  });

  it('ignores values that are zero or absent', () => {
    expect(walk({ durationSec: 900, distanceM: 0 })).toBe(false);
    expect(walk({ avgSpeedKmh: 0 })).toBe(false);
    expect(walk({})).toBe(false);
  });

  it('never applies outside walking, where speed is not what the effort is read from', () => {
    expect(
      paceReplacesIntensity('CARDIO', { durationSec: 900, distanceM: 1250, avgSpeedKmh: 5 }),
    ).toBe(false);
    expect(paceReplacesIntensity(null, { durationSec: 900, distanceM: 1250, avgSpeedKmh: 5 })).toBe(
      false,
    );
  });
});
