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
