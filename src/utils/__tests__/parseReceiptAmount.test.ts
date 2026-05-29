import { describe, expect, it } from 'vitest';

import { parseReceiptAmount } from '../parseReceiptAmount';

describe('parseReceiptAmount', () => {
  it('prefers GRAND TOTAL over subtotal and tax lines', () => {
    const text = [
      'Subtotal        $10.00',
      'Tax              $1.30',
      'GRAND TOTAL     $11.30',
    ].join('\n');

    const result = parseReceiptAmount(text);
    expect(result.detectedAmountCents).toBe(1130);
    expect(result.detectedAmountText).toContain('11.30');
  });

  it('prefers AMOUNT DUE over generic amounts', () => {
    const text = ['Tip $2.00', 'AMOUNT DUE $45.67'].join('\n');
    const result = parseReceiptAmount(text);
    expect(result.detectedAmountCents).toBe(4567);
  });

  it('prefers BALANCE DUE over lower-priority lines', () => {
    const text = ['Change $0.00', 'BALANCE DUE $88.40'].join('\n');
    const result = parseReceiptAmount(text);
    expect(result.detectedAmountCents).toBe(8840);
  });

  it('ignores payment method lines', () => {
    const text = ['Debit Card $12.34', 'TOTAL $56.78'].join('\n');
    const result = parseReceiptAmount(text);
    expect(result.detectedAmountCents).toBe(5678);
  });

  it('returns null when no amount is found', () => {
    const result = parseReceiptAmount('Thank you for dining with us.');
    expect(result.detectedAmountCents).toBeNull();
  });
});
