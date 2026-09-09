import { z } from 'zod';

/**
 * An empty numeric field, however it got that way.
 *
 * A rendered field reads back from the DOM as NaN. One the current form does
 * not show - the incline outside a treadmill, say - never reaches the DOM at
 * all and keeps its default, which is undefined now that these are text
 * inputs. Both mean the same thing to every rule below, so they are levelled
 * here; without it a field nobody can see fails the schema and the form
 * refuses to submit with no message to explain why.
 */
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

/** What a form field holds before anything is typed into it. */
export type EmptyOr<T> = T | undefined;

/**
 * The same fields once the schema has run: every empty one is a NaN by then,
 * never undefined, so a submit handler is spared the second possibility. Hand
 * it to useForm as the third type argument.
 */
export type Submitted<T> = { [K in keyof T]-?: NonNullable<T[K]> };

export const toValue = (value: EmptyOr<number>): number | null =>
  value !== undefined && Number.isFinite(value) ? value : null;

export const toOptional = (value: EmptyOr<number>): number | undefined =>
  value !== undefined && Number.isFinite(value) ? value : undefined;

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
