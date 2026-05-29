import type { CurrencyCode } from '../../types/currency';
import type { ExpenseType } from '../../types/models';
import type { ReceiptConversionMetadata } from '../../types/inputs';
import { formatAmountInputValue } from '../../utils/currency';

export interface AddExpensePrefill {
  source?: string;
  amountCents?: number;
  currency?: CurrencyCode;
  receiptUri?: string;
  expenseType?: ExpenseType;
  originalAmountMinor?: number;
  originalCurrency?: CurrencyCode;
  exchangeRate?: number;
  exchangeRateTimestamp?: string;
  exchangeRateProvider?: string;
}

export function normalizeReceiptConversion(
  prefill: AddExpensePrefill | undefined,
  defaultCurrency: CurrencyCode,
): ReceiptConversionMetadata | undefined {
  if (!prefill?.originalAmountMinor || !prefill.originalCurrency) {
    return undefined;
  }

  return {
    originalAmountMinor: prefill.originalAmountMinor,
    originalCurrency: prefill.originalCurrency,
    convertedAmountMinor: prefill.amountCents,
    convertedCurrency: defaultCurrency,
    exchangeRate: prefill.exchangeRate,
    exchangeRateTimestamp: prefill.exchangeRateTimestamp,
    exchangeRateProvider: prefill.exchangeRateProvider,
  };
}

export function normalizeInitialAmountText(
  prefill: AddExpensePrefill | undefined,
  defaultCurrency: CurrencyCode,
): string {
  if (prefill?.amountCents && prefill.amountCents > 0) {
    return formatAmountInputValue(prefill.amountCents, defaultCurrency);
  }
  return '';
}

export function normalizeInitialExpenseKind(prefill: AddExpensePrefill | undefined): ExpenseType {
  return prefill?.expenseType ?? 'split';
}

export function normalizeInitialReceiptUri(prefill: AddExpensePrefill | undefined): string | undefined {
  return prefill?.receiptUri;
}
