import { supabase } from '../lib/supabase';
import type { CurrencyCode } from '../types/currency';
import { normalizeCurrencyCode } from '../types/currency';
import { createLogger } from '../utils/logger';
import {
  classifyReceiptScanError,
  isExpectedReceiptScanError,
  mapReceiptScanServerErrorCode,
  ReceiptScanError,
} from '../utils/receiptScanErrors';

const logger = createLogger('receiptScanService');

export interface ReceiptScanCandidate {
  label: string;
  amountCents: number;
  rawText: string;
}

export interface ReceiptScanResult {
  detectedAmountMinor: number | null;
  /** @deprecated Use detectedAmountMinor */
  detectedAmountCents: number | null;
  detectedAmountText: string | null;
  detectedCurrency: CurrencyCode | null;
  targetCurrency: CurrencyCode;
  convertedAmountMinor: number | null;
  /** @deprecated Use convertedAmountMinor */
  convertedAmountCents: number | null;
  exchangeRate: number | null;
  exchangeRateProvider: string | null;
  exchangeRateTimestamp: string | null;
  requiresCurrencySelection: boolean;
  conversionFailed: boolean;
  candidates: ReceiptScanCandidate[];
  confidence?: number;
  noticeCode?: string;
  noticeMessage?: string;
}

interface ReceiptScanResponse {
  ok?: boolean;
  success?: boolean;
  errorCode?: string;
  message?: string;
  error?: string;
  providerStatus?: number;
  debugMessage?: string;
  detectedAmountMinor?: number | null;
  detectedAmountCents?: number | null;
  detectedAmountText?: string | null;
  detectedCurrency?: string | null;
  targetCurrency?: string | null;
  convertedAmountMinor?: number | null;
  convertedAmountCents?: number | null;
  exchangeRate?: number | null;
  exchangeRateProvider?: string | null;
  exchangeRateTimestamp?: string | null;
  requiresCurrencySelection?: boolean;
  conversionFailed?: boolean;
  candidates?: ReceiptScanCandidate[];
  confidence?: number;
}

function responseFailed(data: ReceiptScanResponse | null, invokeError: unknown): boolean {
  if (invokeError) {
    return true;
  }
  if (!data) {
    return true;
  }
  if (data.ok === false || data.success === false) {
    return true;
  }
  if (
    data.errorCode &&
    data.errorCode !== 'NO_AMOUNT_DETECTED' &&
    data.errorCode !== 'CURRENCY_NOT_DETECTED' &&
    !data.requiresCurrencySelection &&
    !data.conversionFailed
  ) {
    return true;
  }
  if (data.error?.trim() && !data.requiresCurrencySelection && !data.conversionFailed) {
    return true;
  }
  return false;
}

function failureFromResponse(data: ReceiptScanResponse | null, invokeError: unknown): never {
  const errorCode = data?.errorCode ?? 'UNKNOWN_OCR_ERROR';
  const message =
    data?.message?.trim() ||
    data?.error?.trim() ||
    (invokeError && typeof invokeError === 'object' && invokeError !== null && 'message' in invokeError
      ? String((invokeError as { message?: string }).message ?? '').trim()
      : undefined);

  throw mapReceiptScanServerErrorCode(errorCode, message, { providerStatus: data?.providerStatus });
}

function mapScanResponse(data: ReceiptScanResponse, targetCurrency: CurrencyCode): ReceiptScanResult {
  const detectedAmountMinor = data.detectedAmountMinor ?? data.detectedAmountCents ?? null;
  const convertedAmountMinor = data.convertedAmountMinor ?? data.convertedAmountCents ?? null;
  const normalizedTarget = normalizeCurrencyCode(data.targetCurrency, targetCurrency);
  const detectedCurrency = data.detectedCurrency
    ? normalizeCurrencyCode(data.detectedCurrency, normalizedTarget)
    : null;

  return {
    detectedAmountMinor,
    detectedAmountCents: detectedAmountMinor,
    detectedAmountText: data.detectedAmountText ?? null,
    detectedCurrency: data.detectedCurrency === null ? null : detectedCurrency,
    targetCurrency: normalizedTarget,
    convertedAmountMinor,
    convertedAmountCents: convertedAmountMinor,
    exchangeRate: data.exchangeRate ?? null,
    exchangeRateProvider: data.exchangeRateProvider ?? null,
    exchangeRateTimestamp: data.exchangeRateTimestamp ?? null,
    requiresCurrencySelection: data.requiresCurrencySelection ?? false,
    conversionFailed: data.conversionFailed ?? false,
    candidates: data.candidates ?? [],
    confidence: data.confidence,
    noticeCode: data.errorCode,
    noticeMessage: data.message,
  };
}

async function invokeScanReceipt(body: Record<string, unknown>): Promise<ReceiptScanResult> {
  const targetCurrency = normalizeCurrencyCode(
    typeof body.targetCurrency === 'string' ? body.targetCurrency : undefined,
  );

  const { data, error } = await supabase.functions.invoke<ReceiptScanResponse>('scan-receipt', { body });

  if (responseFailed(data, error)) {
    failureFromResponse(data, error);
  }

  return mapScanResponse(data ?? {}, targetCurrency);
}

export async function scanReceiptImage(input: {
  imageBase64: string;
  mimeType?: string;
  targetCurrency?: CurrencyCode;
}): Promise<ReceiptScanResult> {
  const mimeType = input.mimeType ?? 'image/jpeg';
  const targetCurrency = normalizeCurrencyCode(input.targetCurrency);
  logger.info('Receipt scan started', {
    hasImageBase64: Boolean(input.imageBase64?.trim()),
    mimeType,
    targetCurrency,
  });

  try {
    const result = await invokeScanReceipt({
      imageBase64: input.imageBase64,
      mimeType,
      targetCurrency,
    });

    logger.info('Receipt scan succeeded', {
      detectedAmountMinor: result.detectedAmountMinor,
      detectedCurrency: result.detectedCurrency,
      convertedAmountMinor: result.convertedAmountMinor,
      targetCurrency: result.targetCurrency,
      candidateCount: result.candidates.length,
    });
    return result;
  } catch (error) {
    if (error instanceof ReceiptScanError) {
      if (isExpectedReceiptScanError(error)) {
        logger.warn(
          'Receipt scan failed',
          {
            code: error.serverErrorCode ?? error.code,
            message: error.message,
            providerStatus: error.providerStatus ?? null,
          },
          error,
        );
      } else {
        logger.error(
          'Receipt scan failed',
          error,
          {
            code: error.serverErrorCode ?? error.code,
            message: error.message,
            providerStatus: error.providerStatus ?? null,
          },
        );
      }
      throw error;
    }

    const classified = classifyReceiptScanError(error);
    logger.warn('Receipt scan failed', { code: classified.code, message: classified.message });
    throw classified;
  }
}

export async function convertReceiptAmount(input: {
  detectedAmountText?: string;
  amountMinor?: number;
  sourceCurrency: CurrencyCode;
  targetCurrency?: CurrencyCode;
}): Promise<ReceiptScanResult> {
  const targetCurrency = normalizeCurrencyCode(input.targetCurrency);
  logger.info('Receipt convert-only started', {
    sourceCurrency: input.sourceCurrency,
    targetCurrency,
    hasAmountMinor: input.amountMinor !== undefined,
  });

  try {
    const result = await invokeScanReceipt({
      convertOnly: true,
      sourceCurrency: input.sourceCurrency,
      targetCurrency,
      ...(input.amountMinor !== undefined ? { amountMinor: input.amountMinor } : {}),
      ...(input.detectedAmountText ? { detectedAmountText: input.detectedAmountText } : {}),
    });

    logger.info('Receipt convert-only succeeded', {
      convertedAmountMinor: result.convertedAmountMinor,
      targetCurrency: result.targetCurrency,
    });
    return result;
  } catch (error) {
    if (error instanceof ReceiptScanError) {
      logger.warn('Receipt convert-only failed', {
        code: error.serverErrorCode ?? error.code,
        message: error.message,
      });
      throw error;
    }
    const classified = classifyReceiptScanError(error);
    logger.warn('Receipt convert-only failed', { code: classified.code, message: classified.message });
    throw classified;
  }
}
