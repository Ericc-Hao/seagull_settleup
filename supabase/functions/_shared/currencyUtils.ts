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
];

export function isSupportedCurrency(value: string | null | undefined): value is CurrencyCode {
  return Boolean(value && SUPPORTED_CURRENCIES.includes(value as CurrencyCode));
}

export function normalizeCurrencyCode(value: string | null | undefined, fallback: CurrencyCode = 'CAD'): CurrencyCode {
  const upper = value?.trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : fallback;
}

export function currencyMinorUnit(currency: CurrencyCode): number {
  switch (currency) {
    case 'JPY':
    case 'KRW':
      return 0;
    default:
      return 2;
  }
}

export function currencyMinorMultiplier(currency: CurrencyCode): number {
  return 10 ** currencyMinorUnit(currency);
}

export function parseAmountToMinorUnits(amount: string | number, currency: CurrencyCode): number | null {
  const multiplier = currencyMinorMultiplier(currency);
  let major: number;

  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    major = amount;
  } else {
    const normalized = amount.replace(/[^0-9.-]/g, '');
    major = Number.parseFloat(normalized);
    if (!Number.isFinite(major) || major <= 0) {
      return null;
    }
  }

  const minor = Math.round(major * multiplier);
  return minor > 0 && minor <= 1_000_000_000 ? minor : null;
}

export function convertMinorUnits(
  amountMinor: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rate: number,
): number {
  if (fromCurrency === toCurrency || rate === 1) {
    return amountMinor;
  }

  const fromMultiplier = currencyMinorMultiplier(fromCurrency);
  const toMultiplier = currencyMinorMultiplier(toCurrency);
  const major = amountMinor / fromMultiplier;
  const convertedMajor = major * rate;
  return Math.round(convertedMajor * toMultiplier);
}
