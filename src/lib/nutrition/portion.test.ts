import { describe, expect, it } from 'vitest';

import type { Food } from '@/lib/api/types';

import { canLogInUnit, previewPortion } from './portion';

const chickenBreast: Food = {
  id: 'food-1',
  name: 'Chicken breast',
  brand: null,
  servingSize: 100,
  servingUnit: 'GRAM',
  energyKcal: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
  source: 'MANUAL',
  isOwned: true,
  lastUsedAt: null,
  usageCount: 0,
};

describe('previewPortion', () => {
  it('scales the definition to the logged amount', () => {
    expect(previewPortion(chickenBreast, 200, 'GRAM')).toEqual({
      energyKcal: 330,
      proteinG: 62,
      carbsG: 0,
      fatG: 7.2,
    });
  });

  it('treats a serving as a multiple of the whole definition', () => {
    expect(previewPortion(chickenBreast, 1.5, 'SERVING')?.energyKcal).toBe(248);
  });

  it('keeps missing macros missing', () => {
    const coffee: Food = {
      ...chickenBreast,
      servingSize: 1,
      servingUnit: 'SERVING',
      energyKcal: 40,
      proteinG: null,
      carbsG: null,
      fatG: null,
    };

    expect(previewPortion(coffee, 2, 'SERVING')).toEqual({
      energyKcal: 80,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
  });

  it('refuses an incompatible unit instead of inventing a conversion', () => {
    expect(previewPortion(chickenBreast, 200, 'MILLILITER')).toBeNull();
    expect(canLogInUnit(chickenBreast, 'MILLILITER')).toBe(false);
    expect(canLogInUnit(chickenBreast, 'GRAM')).toBe(true);
    expect(canLogInUnit(chickenBreast, 'SERVING')).toBe(true);
  });
});
