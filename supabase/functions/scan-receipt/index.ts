/// <reference path="../deno.d.ts" />

import { convertAmountMinor, ExchangeRateError } from '../_shared/exchangeRates.ts';
import {
  isSupportedCurrency,
  normalizeCurrencyCode,
  parseAmountToMinorUnits,
} from '../_shared/currencyUtils.ts';
import { extractReceiptFromImage } from './ocrProvider.ts';
import {
  httpStatusForOcrError,
  OcrProviderError,
  userMessageForOcrError,
} from './ocrErrors.ts';
import { parseReceiptAmount } from './parseReceiptAmount.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type JsonBody = Record<string, unknown>;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']);

function jsonResponse(body: JsonBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function log(event: string, context: JsonBody = {}): void {
  console.log(JSON.stringify({ event, ...context }));
}

function normalizeMimeType(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'image/jpeg';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'image/jpg') {
    return 'image/jpeg';
  }
  return normalized;
}

function validateImageBase64(imageBase64: string): void {
  if (!imageBase64.trim()) {
    throw new OcrProviderError('REQUEST_BODY_INVALID', 'Receipt image is required.');
  }
  const stripped = imageBase64.replace(/\s/g, '');
  if (stripped.length < 32 || !/^[A-Za-z0-9+/=]+$/.test(stripped)) {
    throw new OcrProviderError('INVALID_IMAGE', 'Could not read the receipt image.');
  }
}

function totalToMinorUnits(total: string, currency: string): number | null {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const direct = parseAmountToMinorUnits(total, normalizedCurrency);
  if (direct) {
    return direct;
  }
  const parsed = parseReceiptAmount(`TOTAL ${total}`);
  return parsed.detectedAmountCents;
}

function buildErrorBody(error: OcrProviderError): JsonBody {
  return {
    ok: false,
    success: false,
    errorCode: error.code,
    message: userMessageForOcrError(error.code),
    error: userMessageForOcrError(error.code),
    debugMessage: error.message,
    ...(error.status !== undefined ? { providerStatus: error.status } : {}),
  };
}

function buildConversionBody(input: {
  detectedAmountText: string | null;
  detectedCurrency: string | null;
  detectedAmountMinor: number | null;
  targetCurrency: string;
  convertedAmountMinor?: number | null;
  exchangeRate?: number | null;
  exchangeRateProvider?: string | null;
  exchangeRateTimestamp?: string | null;
  candidates?: { label: string; amountCents: number; rawText: string }[];
  confidence?: number;
  requiresCurrencySelection?: boolean;
  conversionFailed?: boolean;
  errorCode?: string;
  message?: string;
}): JsonBody {
  const targetCurrency = normalizeCurrencyCode(input.targetCurrency);
  const detectedAmountCents = input.detectedAmountMinor;
  const convertedAmountMinor = input.convertedAmountMinor ?? null;

  return {
    ok: true,
    success: true,
    detectedAmountText: input.detectedAmountText,
    detectedCurrency: input.detectedCurrency,
    detectedAmountMinor: input.detectedAmountMinor,
    detectedAmountCents,
    targetCurrency,
    convertedAmountMinor,
    convertedAmountCents: convertedAmountMinor,
    currency: targetCurrency,
    exchangeRate: input.exchangeRate ?? null,
    exchangeRateProvider: input.exchangeRateProvider ?? null,
    exchangeRateTimestamp: input.exchangeRateTimestamp ?? null,
    candidates: input.candidates ?? [],
    confidence: input.confidence,
    requiresCurrencySelection: input.requiresCurrencySelection ?? false,
    conversionFailed: input.conversionFailed ?? false,
    ...(input.errorCode ? { errorCode: input.errorCode, message: input.message } : {}),
  };
}

async function handleConvertOnly(body: Record<string, unknown>): Promise<Response> {
  const sourceCurrencyRaw = typeof body.sourceCurrency === 'string' ? body.sourceCurrency : '';
  const targetCurrencyRaw = typeof body.targetCurrency === 'string' ? body.targetCurrency : 'CAD';
  const targetCurrency = normalizeCurrencyCode(targetCurrencyRaw);

  let detectedAmountMinor: number | null = null;
  let detectedAmountText: string | null = null;

  if (typeof body.amountMinor === 'number' && Number.isFinite(body.amountMinor) && body.amountMinor > 0) {
    detectedAmountMinor = Math.round(body.amountMinor);
  } else if (typeof body.detectedAmountText === 'string' && body.detectedAmountText.trim()) {
    detectedAmountText = body.detectedAmountText.trim();
    if (!isSupportedCurrency(sourceCurrencyRaw.trim().toUpperCase())) {
      return jsonResponse(
        buildConversionBody({
          detectedAmountText,
          detectedCurrency: null,
          detectedAmountMinor: null,
          targetCurrency,
          requiresCurrencySelection: true,
          errorCode: 'CURRENCY_NOT_DETECTED',
          message: userMessageForOcrError('CURRENCY_NOT_DETECTED'),
        }),
      );
    }
    detectedAmountMinor = totalToMinorUnits(detectedAmountText, sourceCurrencyRaw);
  }

  if (!detectedAmountMinor) {
    throw new OcrProviderError('NO_AMOUNT_DETECTED', 'Could not parse receipt amount.');
  }

  const detectedCurrency = normalizeCurrencyCode(sourceCurrencyRaw);
  if (!isSupportedCurrency(sourceCurrencyRaw.trim().toUpperCase())) {
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency: null,
        detectedAmountMinor,
        targetCurrency,
        requiresCurrencySelection: true,
        errorCode: 'CURRENCY_NOT_DETECTED',
        message: userMessageForOcrError('CURRENCY_NOT_DETECTED'),
      }),
    );
  }

  if (detectedCurrency === targetCurrency) {
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency,
        detectedAmountMinor,
        targetCurrency,
        convertedAmountMinor: detectedAmountMinor,
        exchangeRate: 1,
        exchangeRateProvider: 'identity',
        exchangeRateTimestamp: new Date().toISOString(),
      }),
    );
  }

  try {
    const conversion = await convertAmountMinor(detectedAmountMinor, detectedCurrency, targetCurrency);
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency,
        detectedAmountMinor,
        targetCurrency,
        convertedAmountMinor: conversion.convertedAmountMinor,
        exchangeRate: conversion.exchangeRate,
        exchangeRateProvider: conversion.exchangeRateProvider,
        exchangeRateTimestamp: conversion.exchangeRateTimestamp,
      }),
    );
  } catch (error) {
    const code =
      error instanceof ExchangeRateError ? error.code : ('EXCHANGE_RATE_UNAVAILABLE' as const);
    log('scan_receipt_conversion_failed', { errorCode: code, detectedCurrency, targetCurrency });
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency,
        detectedAmountMinor,
        targetCurrency,
        convertedAmountMinor: detectedAmountMinor,
        conversionFailed: true,
        errorCode: code,
        message: userMessageForOcrError(code),
      }),
      httpStatusForOcrError(code),
    );
  }
}

async function applyConversion(
  detectedAmountText: string,
  detectedCurrency: string | null,
  detectedAmountMinor: number,
  targetCurrency: string,
  candidates: { label: string; amountCents: number; rawText: string }[],
  confidence?: number,
): Promise<Response> {
  const normalizedTarget = normalizeCurrencyCode(targetCurrency);

  if (!detectedCurrency) {
    log('scan_receipt_currency_not_detected', { detectedAmountMinor, targetCurrency: normalizedTarget });
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency: null,
        detectedAmountMinor,
        targetCurrency: normalizedTarget,
        candidates,
        confidence,
        requiresCurrencySelection: true,
        errorCode: 'CURRENCY_NOT_DETECTED',
        message: userMessageForOcrError('CURRENCY_NOT_DETECTED'),
      }),
    );
  }

  if (detectedCurrency === normalizedTarget) {
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency,
        detectedAmountMinor,
        targetCurrency: normalizedTarget,
        convertedAmountMinor: detectedAmountMinor,
        exchangeRate: 1,
        exchangeRateProvider: 'identity',
        exchangeRateTimestamp: new Date().toISOString(),
        candidates,
        confidence,
      }),
    );
  }

  try {
    const conversion = await convertAmountMinor(detectedAmountMinor, detectedCurrency, normalizedTarget);
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency,
        detectedAmountMinor,
        targetCurrency: normalizedTarget,
        convertedAmountMinor: conversion.convertedAmountMinor,
        exchangeRate: conversion.exchangeRate,
        exchangeRateProvider: conversion.exchangeRateProvider,
        exchangeRateTimestamp: conversion.exchangeRateTimestamp,
        candidates,
        confidence,
      }),
    );
  } catch (error) {
    const code =
      error instanceof ExchangeRateError ? error.code : ('EXCHANGE_RATE_UNAVAILABLE' as const);
    log('scan_receipt_conversion_failed', { errorCode: code, detectedCurrency, targetCurrency: normalizedTarget });
    return jsonResponse(
      buildConversionBody({
        detectedAmountText,
        detectedCurrency,
        detectedAmountMinor,
        targetCurrency: normalizedTarget,
        convertedAmountMinor: detectedAmountMinor,
        candidates,
        confidence,
        conversionFailed: true,
        errorCode: code,
        message: userMessageForOcrError(code),
      }),
      httpStatusForOcrError(code),
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const targetCurrency =
      typeof body.targetCurrency === 'string' && body.targetCurrency.trim()
        ? body.targetCurrency.trim()
        : 'CAD';
    const convertOnly = body.convertOnly === true;

    if (convertOnly) {
      log('scan_receipt_convert_only_started', { targetCurrency });
      return await handleConvertOnly(body);
    }

    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = normalizeMimeType(body.mimeType);

    validateImageBase64(imageBase64);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new OcrProviderError('INVALID_IMAGE', 'Could not read the receipt image.');
    }

    log('scan_receipt_started', { mimeType, targetCurrency, imageBytes: imageBase64.replace(/\s/g, '').length });

    const ocr = await extractReceiptFromImage({ imageBase64, mimeType });

    if (!ocr.total) {
      console.warn(JSON.stringify({ event: 'scan_receipt_no_amount_detected', currency: ocr.currency }));
      return jsonResponse(
        buildConversionBody({
          detectedAmountText: null,
          detectedCurrency: ocr.currency,
          detectedAmountMinor: null,
          targetCurrency,
          confidence: ocr.confidence,
        }),
        httpStatusForOcrError('NO_AMOUNT_DETECTED'),
      );
    }

    const detectedCurrency = ocr.currency;
    const currencyForMinor = detectedCurrency ?? normalizeCurrencyCode(targetCurrency);
    const detectedAmountMinor = totalToMinorUnits(ocr.total, currencyForMinor);

    if (!detectedAmountMinor) {
      console.warn(
        JSON.stringify({
          event: 'scan_receipt_no_amount_detected',
          currency: detectedCurrency,
          total: ocr.total,
        }),
      );
      return jsonResponse(
        buildConversionBody({
          detectedAmountText: ocr.total,
          detectedCurrency,
          detectedAmountMinor: null,
          targetCurrency,
          confidence: ocr.confidence,
        }),
        httpStatusForOcrError('NO_AMOUNT_DETECTED'),
      );
    }

    const parsed = parseReceiptAmount(`TOTAL ${ocr.total}`);
    const candidates = parsed.candidates.map(({ label, amountCents, rawText }) => ({
      label,
      amountCents,
      rawText,
    }));

    log('scan_receipt_succeeded', {
      hasAmount: true,
      candidateCount: candidates.length,
      detectedCurrency,
      targetCurrency,
    });

    return await applyConversion(
      ocr.total,
      detectedCurrency,
      detectedAmountMinor,
      targetCurrency,
      candidates.length > 0
        ? candidates
        : [{ label: 'total', amountCents: detectedAmountMinor, rawText: ocr.total }],
      ocr.confidence ?? parsed.confidence,
    );
  } catch (error) {
    if (error instanceof OcrProviderError) {
      log('scan_receipt_failed', {
        errorCode: error.code,
        providerStatus: error.status ?? null,
        message: error.message,
      });

      if (error.code === 'NO_AMOUNT_DETECTED') {
        return jsonResponse(
          buildConversionBody({
            detectedAmountText: null,
            detectedCurrency: null,
            detectedAmountMinor: null,
            targetCurrency: 'CAD',
            errorCode: error.code,
            message: userMessageForOcrError(error.code),
          }),
          httpStatusForOcrError(error.code),
        );
      }

      return jsonResponse(buildErrorBody(error), httpStatusForOcrError(error.code));
    }

    const message = error instanceof Error ? error.message : 'Receipt scanning failed.';
    log('scan_receipt_failed', { errorCode: 'UNKNOWN_OCR_ERROR', message });

    return jsonResponse(
      {
        ok: false,
        success: false,
        errorCode: 'UNKNOWN_OCR_ERROR',
        message: userMessageForOcrError('UNKNOWN_OCR_ERROR'),
        error: userMessageForOcrError('UNKNOWN_OCR_ERROR'),
        debugMessage: message,
      },
      httpStatusForOcrError('UNKNOWN_OCR_ERROR'),
    );
  }
});
