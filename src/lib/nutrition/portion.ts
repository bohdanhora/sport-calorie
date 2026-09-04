import type { Food, FoodUnit } from '@/lib/api/types';

export interface PortionPreview {
  energyKcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

const round = (value: number, decimals = 0): number => {
  const factor = 10 ** decimals;

  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const canLogInUnit = (food: Food, unit: FoodUnit): boolean =>
  unit === 'SERVING' || unit === food.servingUnit;

export const portionFactor = (food: Food, amount: number, unit: FoodUnit): number | null => {
  if (unit === 'SERVING') {
    return amount;
  }

  if (unit !== food.servingUnit || food.servingSize <= 0) {
    return null;
  }

  return amount / food.servingSize;
};

export const previewPortion = (
  food: Food,
  amount: number,
  unit: FoodUnit,
): PortionPreview | null => {
  const factor = portionFactor(food, amount, unit);

  if (factor === null || !Number.isFinite(factor)) {
    return null;
  }

  const scale = (value: number | null): number | null =>
    value === null ? null : round(value * factor, 1);

  return {
    energyKcal: round(food.energyKcal * factor),
    proteinG: scale(food.proteinG),
    carbsG: scale(food.carbsG),
    fatG: scale(food.fatG),
  };
};

export const FOOD_UNIT_LABELS: Record<FoodUnit, string> = {
  GRAM: 'g',
  MILLILITER: 'ml',
  PIECE: 'piece',
  SERVING: 'serving',
};

export const describeServing = (food: Food): string =>
  `${food.servingSize} ${FOOD_UNIT_LABELS[food.servingUnit]}`;
