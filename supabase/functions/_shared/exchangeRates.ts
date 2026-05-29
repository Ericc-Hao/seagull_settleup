import {
  convertMinorUnits,
  type CurrencyCode,
  isSupportedCurrency,
  normalizeCurrencyCode,
} from './currencyUtils.ts';

export type ExchangeRateErrorCode = 'EXCHANGE_RATE_UNAVAILABLE' | 'UNSUPPORTED_CURRENCY';

export class ExchangeRateError extends Error {
  code: ExchangeRateErrorCode;

  constructor(code: ExchangeRateErrorCode, message: string) {
    super(message);
    this.name = 'ExchangeRateError';
    this.code = code;
  }
}

export interface ExchangeRateResult {
  rate: number;
  provider: string;
  timestamp: string;
}

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app/latest';

function log(event: string, context: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...context }));
}

async function fetchFrankfurterRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode): Promise<ExchangeRateResult> {
  const url = `${FRANKFURTER_BASE_URL}?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`;
  log('exchange_rate_request_started', { provider: 'frankfurter', fromCurrency, toCurrency });

  const response = await fetch(url);
  if (!response.ok) {
    const bodyPreview = (await response.text()).slice(0, 300);
    log('exchange_rate_request_failed', { provider: 'frankfurter', status: response.status, bodyPreview });
    throw new ExchangeRateError('EXCHANGE_RATE_UNAVAILABLE', 'Could not fetch exchange rate.');
  }

  const json = await response.json();
  const rate = json?.rates?.[toCurrency];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    log('exchange_rate_invalid_response', { provider: 'frankfurter', fromCurrency, toCurrency });
    throw new ExchangeRateError('EXCHANGE_RATE_UNAVAILABLE', 'Exchange rate response was invalid.');
  }

  const timestamp =
    typeof json?.date === 'string'
      ? `${json.date}T00:00:00Z`
      : new Date().toISOString();

  log('exchange_rate_request_succeeded', { provider: 'frankfurter', fromCurrency, toCurrency, rate });
  return { rate, provider: 'frankfurter', timestamp };
}

export async function getExchangeRate(
  fromCurrencyRaw: string,
  toCurrencyRaw: string,
): Promise<ExchangeRateResult> {
  const fromCurrency = normalizeCurrencyCode(fromCurrencyRaw);
  const toCurrency = normalizeCurrencyCode(toCurrencyRaw);

  if (!isSupportedCurrency(fromCurrencyRaw?.trim().toUpperCase()) && fromCurrencyRaw?.trim()) {
    throw new ExchangeRateError('UNSUPPORTED_CURRENCY', 'Source currency is not supported.');
  }
  if (!isSupportedCurrency(toCurrencyRaw?.trim().toUpperCase()) && toCurrencyRaw?.trim()) {
    throw new ExchangeRateError('UNSUPPORTED_CURRENCY', 'Target currency is not supported.');
  }

  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      provider: 'identity',
      timestamp: new Date().toISOString(),
    };
  }

  const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY')?.trim();
  if (apiKey) {
    log('exchange_rate_custom_provider_not_implemented', { fromCurrency, toCurrency });
  }

  return fetchFrankfurterRate(fromCurrency, toCurrency);
}

export async function convertAmountMinor(
  amountMinor: number,
  fromCurrencyRaw: string,
  toCurrencyRaw: string,
): Promise<{
  convertedAmountMinor: number;
  exchangeRate: number;
  exchangeRateProvider: string;
  exchangeRateTimestamp: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
}> {
  const fromCurrency = normalizeCurrencyCode(fromCurrencyRaw);
  const toCurrency = normalizeCurrencyCode(toCurrencyRaw);
  const { rate, provider, timestamp } = await getExchangeRate(fromCurrency, toCurrency);

  return {
    convertedAmountMinor: convertMinorUnits(amountMinor, fromCurrency, toCurrency, rate),
    exchangeRate: rate,
    exchangeRateProvider: provider,
    exchangeRateTimestamp: timestamp,
    fromCurrency,
    toCurrency,
  };
}
