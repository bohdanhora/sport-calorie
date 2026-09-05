import type { ActivityCategory } from '@/lib/api/types';

export interface PaceInput {
  durationSec: number | null;
  distanceM: number | null;
  avgSpeedKmh: number | null;
}

const isPositive = (value: number | null): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Whether a measured pace stands in for the intensity guess.
 *
 * The API works an average speed out of any two of duration, distance and pace,
 * and for a walk it takes the effort from that speed and the incline, never
 * looking at the intensity at all. Asking for one there would be asking for an
 * answer nothing reads, so the form drops the question instead.
 */
export const paceReplacesIntensity = (
  category: ActivityCategory | null,
  { durationSec, distanceM, avgSpeedKmh }: PaceInput,
): boolean => {
  if (category !== 'WALKING') {
    return false;
  }

  return isPositive(avgSpeedKmh) || (isPositive(durationSec) && isPositive(distanceM));
};
