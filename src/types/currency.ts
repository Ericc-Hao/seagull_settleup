/** Supported ISO 4217 currency codes for expenses and receipt conversion. */

export type CurrencyCode =
  | 'CAD'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'CNY'
  | 'HKD'
  | 'TWD'
  | 'JPY'
  | 'KRW'
  | 'AUD'
  | 'SGD';

export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = [
  'CAD',
  'USD',
  'EUR',
  'GBP',
  'CNY',
  'HKD',
  'TWD',
  'JPY',
  'KRW',
  'AUD',
  'SGD',
] as const;

export const PROFILE_CURRENCY_OPTIONS: readonly CurrencyCode[] = SUPPORTED_CURRENCIES;

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return Boolean(value && SUPPORTED_CURRENCIES.includes(value as CurrencyCode));
}

export function normalizeCurrencyCode(value: string | null | undefined, fallback: CurrencyCode = 'CAD'): CurrencyCode {
  const upper = value?.trim().toUpperCase();
  return isCurrencyCode(upper) ? upper : fallback;
}
