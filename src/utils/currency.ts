import type { CurrencyCode } from '../types/currency';
import { isCurrencyCode, normalizeCurrencyCode } from '../types/currency';

/** Decimal places used when displaying/editing amounts for a currency. */
export function currencyMinorUnit(currency: CurrencyCode): number {
  switch (currency) {
    case 'JPY':
    case 'KRW':
      return 0;
    default:
      return 2;
  }
}

/** Multiplier to convert major units to minor units (e.g. dollars → cents). */
export function currencyMinorMultiplier(currency: CurrencyCode): number {
  return 10 ** currencyMinorUnit(currency);
}

export function parseAmountToMinorUnits(amount: string | number, currency: CurrencyCode): number {
  const multiplier = currencyMinorMultiplier(currency);
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) {
      return 0;
    }
    return Math.round(amount * multiplier);
  }

  const normalized = amount.replace(/[^0-9.-]/g, '');
  const major = Number.parseFloat(normalized);
  if (!Number.isFinite(major)) {
    return 0;
  }
  return Math.round(major * multiplier);
}

export function minorUnitsToMajor(amountMinor: number, currency: CurrencyCode): number {
  const multiplier = currencyMinorMultiplier(currency);
  return amountMinor / multiplier;
}

export function formatCurrency(
  amountMinor: number,
  currency: CurrencyCode,
  options?: { includeCode?: boolean; locale?: string },
): string {
  const includeCode = options?.includeCode ?? true;
  const locale = options?.locale ?? 'en-CA';
  const minorUnit = currencyMinorUnit(currency);
  const major = minorUnitsToMajor(amountMinor, currency);

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  }).format(major);

  if (!includeCode) {
    return formatted;
  }

  if (formatted.includes(currency)) {
    return formatted;
  }

  return `${formatted} ${currency}`;
}

export function formatAmountInputValue(amountMinor: number, currency: CurrencyCode = 'CAD'): string {
  if (amountMinor <= 0) {
    return '';
  }
  const minorUnit = currencyMinorUnit(currency);
  if (minorUnit === 0) {
    return String(amountMinor);
  }
  return minorUnitsToMajor(amountMinor, currency).toFixed(minorUnit);
}

export function sanitizeAmountInput(value: string, currency: CurrencyCode = 'CAD'): string {
  const minorUnit = currencyMinorUnit(currency);
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (minorUnit === 0) {
    return cleaned.replace(/\./g, '');
  }
  const parts = cleaned.split('.');
  if (parts.length <= 1) {
    return cleaned;
  }
  return `${parts[0]}.${parts.slice(1).join('').slice(0, minorUnit)}`;
}

export function parseAmountInput(value: string, currency: CurrencyCode = 'CAD'): number {
  return parseAmountToMinorUnits(value, currency);
}

export function formatExchangeRateLine(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rate: number,
): string {
  const formattedRate = rate >= 1 ? rate.toFixed(4) : rate.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return `1 ${fromCurrency} = ${formattedRate} ${toCurrency}`;
}

export { isCurrencyCode, normalizeCurrencyCode };
