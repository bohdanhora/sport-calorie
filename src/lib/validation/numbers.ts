import { z } from 'zod';

export const requiredNumber = (message: string, min = 0) =>
  z
    .union([z.number(), z.nan()])
    .refine((value) => Number.isFinite(value), message)
    .refine((value) => value >= min, message);

export const positiveNumber = (message: string) =>
  z
    .union([z.number(), z.nan()])
    .refine((value) => Number.isFinite(value), message)
    .refine((value) => value > 0, message);

export const optionalNumber = (message: string, min = 0) =>
  z
    .union([z.number(), z.nan()])
    .refine((value) => Number.isNaN(value) || (Number.isFinite(value) && value >= min), message);

export const toValue = (value: number): number | null => (Number.isFinite(value) ? value : null);

export const toOptional = (value: number): number | undefined =>
  Number.isFinite(value) ? value : undefined;

/**
 * A number out of what someone typed, accepting either decimal separator.
 *
 * `input[type="number"]` only ever takes a full stop, whatever the locale,
 * while a phone keyboard set to Russian or Ukrainian offers a comma - and the
 * browser answers an invalid number field with an empty string, so a comma left
 * no way to enter 78.5 at all. The fields are plain text now and the parsing
 * happens here instead.
 */
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
