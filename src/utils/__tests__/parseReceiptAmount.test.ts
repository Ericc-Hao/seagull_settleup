import { describe, expect, it } from 'vitest';

import { RECEIPT_AMOUNT_SAMPLES } from '../../test/fixtures/receiptAmountSamples';
import { parseReceiptAmount } from '../parseReceiptAmount';

describe('parseReceiptAmount', () => {
  it('prefers GRAND TOTAL over subtotal and tax lines', () => {
    const result = parseReceiptAmount(RECEIPT_AMOUNT_SAMPLES.grandTotal);
    expect(result.detectedAmountCents).toBe(1130);
    expect(result.detectedAmountText).toContain('11.30');
  });

  it('prefers AMOUNT DUE over generic amounts', () => {
    const result = parseReceiptAmount(RECEIPT_AMOUNT_SAMPLES.amountDue);
    expect(result.detectedAmountCents).toBe(4567);
  });

  it('prefers BALANCE DUE over lower-priority lines', () => {
    const result = parseReceiptAmount(RECEIPT_AMOUNT_SAMPLES.balanceDue);
    expect(result.detectedAmountCents).toBe(8840);
  });

  it('ignores payment method lines', () => {
    const result = parseReceiptAmount(RECEIPT_AMOUNT_SAMPLES.ignoresPaymentMethod);
    expect(result.detectedAmountCents).toBe(5678);
  });

  it('returns null when no amount is found', () => {
    const result = parseReceiptAmount(RECEIPT_AMOUNT_SAMPLES.noAmount);
    expect(result.detectedAmountCents).toBeNull();
  });
});
