import { describe, expect, it } from 'vitest';

import {
  currencyMinorUnit,
  formatAmountInputValue,
  formatCurrency,
  parseAmountInput,
  parseAmountToMinorUnits,
} from '../currency';

describe('currency utils', () => {
  describe('currencyMinorUnit', () => {
    it('uses zero decimals for JPY and KRW', () => {
      expect(currencyMinorUnit('JPY')).toBe(0);
      expect(currencyMinorUnit('KRW')).toBe(0);
    });

    it('uses two decimals for most currencies', () => {
      expect(currencyMinorUnit('CAD')).toBe(2);
      expect(currencyMinorUnit('USD')).toBe(2);
    });
  });

  describe('parseAmountToMinorUnits', () => {
    it('parses CAD amounts to cents', () => {
      expect(parseAmountToMinorUnits('25.80', 'CAD')).toBe(2580);
    });

    it('parses JPY amounts without fractional minor units', () => {
      expect(parseAmountToMinorUnits('1280', 'JPY')).toBe(1280);
      expect(parseAmountToMinorUnits('1280.5', 'JPY')).toBe(1281);
    });
  });

  describe('formatCurrency', () => {
    it('formats CAD with code suffix when needed', () => {
      expect(formatCurrency(2580, 'CAD')).toContain('25.80');
      expect(formatCurrency(2580, 'CAD')).toMatch(/CAD/);
    });

    it('formats JPY without decimal places', () => {
      expect(formatCurrency(1280, 'JPY')).toContain('1,280');
    });
  });

  describe('formatAmountInputValue', () => {
    it('formats CAD input values with two decimals', () => {
      expect(formatAmountInputValue(3521, 'CAD')).toBe('35.21');
    });

    it('formats JPY input values without decimals', () => {
      expect(formatAmountInputValue(1280, 'JPY')).toBe('1280');
    });
  });

  describe('parseAmountInput', () => {
    it('parses user input using currency minor units', () => {
      expect(parseAmountInput('35.21', 'CAD')).toBe(3521);
      expect(parseAmountInput('1280', 'JPY')).toBe(1280);
    });
  });
});
