import type { ActivityCategory } from '@/lib/api/types';

export interface PaceInput {
  durationSec: number | null;
  distanceM: number | null;
  avgSpeedKmh: number | null;
}

const isPositive = (value: number | null): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const paceReplacesIntensity = (
  category: ActivityCategory | null,
  { durationSec, distanceM, avgSpeedKmh }: PaceInput,
): boolean => {
  if (category !== 'WALKING') {
    return false;
  }

  return isPositive(avgSpeedKmh) || (isPositive(durationSec) && isPositive(distanceM));
};
