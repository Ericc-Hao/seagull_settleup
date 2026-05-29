/// <reference path="../deno.d.ts" />

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

function totalToCents(total: string): number | null {
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

function buildSuccessBody(
  detectedAmountCents: number | null,
  detectedAmountText: string | null,
  currency: string,
  candidates: { label: string; amountCents: number; rawText: string }[],
  confidence?: number,
): JsonBody {
  return {
    ok: true,
    success: true,
    detectedAmountCents,
    detectedAmountText,
    currency,
    candidates,
    confidence,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = normalizeMimeType(body.mimeType);

    validateImageBase64(imageBase64);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new OcrProviderError('INVALID_IMAGE', 'Could not read the receipt image.');
    }

    log('scan_receipt_started', { mimeType, imageBytes: imageBase64.replace(/\s/g, '').length });

    const ocr = await extractReceiptFromImage({ imageBase64, mimeType });

    if (!ocr.total) {
      console.warn(JSON.stringify({ event: 'scan_receipt_no_amount_detected', currency: ocr.currency }));
      return jsonResponse(
        buildSuccessBody(null, null, ocr.currency, []),
        httpStatusForOcrError('NO_AMOUNT_DETECTED'),
      );
    }

    const detectedAmountCents = totalToCents(ocr.total);
    if (!detectedAmountCents) {
      console.warn(
        JSON.stringify({ event: 'scan_receipt_no_amount_detected', currency: ocr.currency, total: ocr.total }),
      );
      return jsonResponse(
        buildSuccessBody(null, ocr.total, ocr.currency, []),
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
      currency: ocr.currency,
    });

    return jsonResponse(
      buildSuccessBody(
        detectedAmountCents,
        ocr.total,
        ocr.currency,
        candidates.length > 0
          ? candidates
          : [{ label: 'total', amountCents: detectedAmountCents, rawText: ocr.total }],
        parsed.confidence,
      ),
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
          {
            ok: true,
            success: true,
            errorCode: error.code,
            message: userMessageForOcrError(error.code),
            detectedAmountCents: null,
            detectedAmountText: null,
            currency: 'CAD',
            candidates: [],
          },
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
