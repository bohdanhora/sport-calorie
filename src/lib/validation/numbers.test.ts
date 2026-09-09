import { describe, expect, it } from 'vitest';

import { toDecimal } from './numbers';

describe('toDecimal', () => {
  it('reads a comma, which is what a localised phone keyboard offers', () => {
    expect(toDecimal('78,5')).toBe(78.5);
    expect(toDecimal('0,25')).toBe(0.25);
  });

  it('still reads a full stop', () => {
    expect(toDecimal('78.5')).toBe(78.5);
    expect(toDecimal('78')).toBe(78);
  });

  it('ignores the spaces a phone keyboard slips in', () => {
    expect(toDecimal(' 78,5 ')).toBe(78.5);
  });

  it('answers NaN for an empty field, which the schema turns into a message', () => {
    expect(toDecimal('')).toBeNaN();
    expect(toDecimal('   ')).toBeNaN();
  });

  it('answers NaN for something that is not a number at all', () => {
    expect(toDecimal('abc')).toBeNaN();
    expect(toDecimal(null)).toBeNaN();
    expect(toDecimal(undefined)).toBeNaN();
  });

  it('passes a number through untouched, for a form reset', () => {
    expect(toDecimal(78.5)).toBe(78.5);
    expect(toDecimal(Number.NaN)).toBeNaN();
  });
});
