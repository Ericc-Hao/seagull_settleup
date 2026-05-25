import { describe, expect, it } from 'vitest';

import { addCents, dollarsToCents, formatCAD, splitAmountEvenly } from '../money';

describe('money utils', () => {
  it('formats CAD from cents', () => {
    expect(formatCAD(55000)).toContain('550');
  });

  it('converts dollars to cents without float drift', () => {
    expect(dollarsToCents('19.99')).toBe(1999);
    expect(dollarsToCents(10.5)).toBe(1050);
  });

  it('splits evenly with remainder', () => {
    expect(splitAmountEvenly(100, 3)).toEqual([34, 33, 33]);
  });

  it('adds cents', () => {
    expect(addCents([100, 200, 300])).toBe(600);
  });
});
