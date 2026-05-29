import { describe, expect, it } from 'vitest';

import type { ReceiptScanResult } from '../../services/receiptScanService';
import { RECEIPT_SCAN_MESSAGES } from '../../utils/receiptScanErrors';
import {
  applyConvertedAmount,
  buildReceiptConversionRouteParams,
  canContinueScanReceipt,
  deriveScanResultUiUpdates,
  validateContinueScanReceipt,
} from '../scanReceipt/scanReceiptFlowHelpers';

function baseScanResult(overrides: Partial<ReceiptScanResult> = {}): ReceiptScanResult {
  return {
    detectedAmountMinor: null,
    detectedAmountCents: null,
    detectedAmountText: null,
    detectedCurrency: null,
    targetCurrency: 'CAD',
    convertedAmountMinor: null,
    convertedAmountCents: null,
    exchangeRate: null,
    exchangeRateProvider: null,
    exchangeRateTimestamp: null,
    requiresCurrencySelection: false,
    conversionFailed: false,
    candidates: [],
    ...overrides,
  };
}

describe('scanReceiptFlowHelpers', () => {
  describe('applyConvertedAmount', () => {
    it('formats converted amount when present', () => {
      const result = baseScanResult({
        convertedAmountMinor: 1250,
        targetCurrency: 'CAD',
      });
      expect(applyConvertedAmount(result)).toBe('12.50');
    });

    it('falls back to detected amount when converted is missing', () => {
      const result = baseScanResult({
        detectedAmountMinor: 999,
        targetCurrency: 'CAD',
      });
      expect(applyConvertedAmount(result)).toBe('9.99');
    });

    it('returns empty string for zero or missing amounts', () => {
      expect(applyConvertedAmount(baseScanResult())).toBe('');
      expect(applyConvertedAmount(baseScanResult({ detectedAmountMinor: 0 }))).toBe('');
    });
  });

  describe('deriveScanResultUiUpdates', () => {
    it('returns currency selection notice', () => {
      const updates = deriveScanResultUiUpdates(
        baseScanResult({
          requiresCurrencySelection: true,
          noticeMessage: 'Pick a currency',
        }),
        '',
      );
      expect(updates.notice).toBe('Pick a currency');
    });

    it('returns conversion failed notice and amount when detected', () => {
      const updates = deriveScanResultUiUpdates(
        baseScanResult({
          conversionFailed: true,
          detectedAmountMinor: 500,
          targetCurrency: 'CAD',
        }),
        '',
      );
      expect(updates.notice).toBe(RECEIPT_SCAN_MESSAGES.exchangeRateUnavailable);
      expect(updates.amountText).toBe('5.00');
    });

    it('returns converted amount and multi-candidate notice', () => {
      const updates = deriveScanResultUiUpdates(
        baseScanResult({
          convertedAmountMinor: 2000,
          targetCurrency: 'CAD',
          candidates: [
            { label: 'total', amountCents: 1000, rawText: '10.00' },
            { label: 'total', amountCents: 2000, rawText: '20.00' },
          ],
        }),
        '',
      );
      expect(updates.amountText).toBe('20.00');
      expect(updates.notice).toBe('2 total candidate(s) found. Review the amount before continuing.');
    });

    it('returns noAmount notice when only detected amount is available', () => {
      const updates = deriveScanResultUiUpdates(
        baseScanResult({
          detectedAmountMinor: 750,
          targetCurrency: 'CAD',
        }),
        '',
      );
      expect(updates.amountText).toBe('7.50');
      expect(updates.notice).toBe(RECEIPT_SCAN_MESSAGES.noAmount);
    });

    it('returns noAmount notice when no amount is detected', () => {
      const updates = deriveScanResultUiUpdates(baseScanResult(), '');
      expect(updates.notice).toBe(RECEIPT_SCAN_MESSAGES.noAmount);
    });
  });

  describe('buildReceiptConversionRouteParams', () => {
    it('returns empty object when scan result is missing detected amount', () => {
      expect(buildReceiptConversionRouteParams(undefined, 'USD')).toEqual({});
      expect(buildReceiptConversionRouteParams(baseScanResult(), 'USD')).toEqual({});
    });

    it('builds route params from scan result metadata', () => {
      const params = buildReceiptConversionRouteParams(
        baseScanResult({
          detectedAmountMinor: 1500,
          detectedCurrency: 'USD',
          exchangeRate: 1.35,
          exchangeRateTimestamp: '2026-05-29T12:00:00.000Z',
          exchangeRateProvider: 'openexchangerates',
        }),
        'EUR',
      );
      expect(params).toEqual({
        originalAmountMinor: '1500',
        originalCurrency: 'USD',
        exchangeRate: '1.35',
        exchangeRateTimestamp: '2026-05-29T12:00:00.000Z',
        exchangeRateProvider: 'openexchangerates',
      });
    });

    it('uses selected source currency when detected currency is missing', () => {
      const params = buildReceiptConversionRouteParams(
        baseScanResult({ detectedAmountMinor: 900 }),
        'EUR',
      );
      expect(params.originalCurrency).toBe('EUR');
    });
  });

  describe('validateContinueScanReceipt', () => {
    it('requires a positive amount', () => {
      expect(validateContinueScanReceipt(0)).toBe(RECEIPT_SCAN_MESSAGES.amountRequired);
      expect(validateContinueScanReceipt(100)).toBeUndefined();
    });
  });

  describe('canContinueScanReceipt', () => {
    it('blocks continue while scanning or converting', () => {
      expect(
        canContinueScanReceipt({
          amountCents: 100,
          scanning: true,
          converting: false,
          requiresCurrencySelection: false,
          amountText: '1.00',
        }),
      ).toBe(false);
      expect(
        canContinueScanReceipt({
          amountCents: 100,
          scanning: false,
          converting: true,
          requiresCurrencySelection: false,
          amountText: '1.00',
        }),
      ).toBe(false);
    });

    it('blocks continue when currency selection is required without amount text', () => {
      expect(
        canContinueScanReceipt({
          amountCents: 100,
          scanning: false,
          converting: false,
          requiresCurrencySelection: true,
          amountText: '',
        }),
      ).toBe(false);
    });

    it('allows continue when amount is valid and flow is idle', () => {
      expect(
        canContinueScanReceipt({
          amountCents: 100,
          scanning: false,
          converting: false,
          requiresCurrencySelection: false,
          amountText: '1.00',
        }),
      ).toBe(true);
    });
  });
});
