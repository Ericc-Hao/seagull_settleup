/** Shared OCR receipt text samples — keep in sync with Edge Function parser tests if added. */
export const RECEIPT_AMOUNT_SAMPLES = {
  grandTotal: [
    'Subtotal        $10.00',
    'Tax              $1.30',
    'GRAND TOTAL     $11.30',
  ].join('\n'),
  amountDue: ['Tip $2.00', 'AMOUNT DUE $45.67'].join('\n'),
  balanceDue: ['Change $0.00', 'BALANCE DUE $88.40'].join('\n'),
  ignoresPaymentMethod: ['Debit Card $12.34', 'TOTAL $56.78'].join('\n'),
  noAmount: 'Thank you for dining with us.',
} as const;
