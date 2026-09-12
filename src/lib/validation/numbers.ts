import { z } from 'zod';

const numeric = z
  .union([z.number(), z.nan(), z.undefined()])
  .transform((value) => value ?? Number.NaN);

export const requiredNumber = (message: string, min = 0) =>
  numeric
    .refine((value) => Number.isFinite(value), message)
    .refine((value) => value >= min, message);

export const positiveNumber = (message: string) =>
  numeric.refine((value) => Number.isFinite(value), message).refine((value) => value > 0, message);

export const optionalNumber = (message: string, min = 0) =>
  numeric.refine(
    (value) => Number.isNaN(value) || (Number.isFinite(value) && value >= min),
    message,
  );

export type EmptyOr<T> = T | undefined;

export type Submitted<T> = { [K in keyof T]-?: NonNullable<T[K]> };

export const toValue = (value: EmptyOr<number>): number | null =>
  value !== undefined && Number.isFinite(value) ? value : null;

export const toOptional = (value: EmptyOr<number>): number | undefined =>
  value !== undefined && Number.isFinite(value) ? value : undefined;

export const toDecimal = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const cleaned = value.trim().replace(',', '.');

  return cleaned === '' ? Number.NaN : Number(cleaned);
};
