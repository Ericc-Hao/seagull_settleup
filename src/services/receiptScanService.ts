import { supabase } from '../lib/supabase';
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
  detectedAmountCents: number | null;
  detectedAmountText: string | null;
  currency: 'CAD';
  candidates: ReceiptScanCandidate[];
  confidence?: number;
}

interface ReceiptScanResponse extends Partial<ReceiptScanResult> {
  ok?: boolean;
  success?: boolean;
  errorCode?: string;
  message?: string;
  error?: string;
  providerStatus?: number;
  debugMessage?: string;
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
  if (data.errorCode && data.errorCode !== 'NO_AMOUNT_DETECTED') {
    return true;
  }
  if (data.error?.trim()) {
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

export async function scanReceiptImage(input: {
  imageBase64: string;
  mimeType?: string;
}): Promise<ReceiptScanResult> {
  const mimeType = input.mimeType ?? 'image/jpeg';
  logger.info('Receipt scan started', {
    hasImageBase64: Boolean(input.imageBase64?.trim()),
    mimeType,
  });

  try {
    const { data, error } = await supabase.functions.invoke<ReceiptScanResponse>('scan-receipt', {
      body: {
        imageBase64: input.imageBase64,
        mimeType,
      },
    });

    if (responseFailed(data, error)) {
      failureFromResponse(data, error);
    }

    const result: ReceiptScanResult = {
      detectedAmountCents: data?.detectedAmountCents ?? null,
      detectedAmountText: data?.detectedAmountText ?? null,
      currency: data?.currency ?? 'CAD',
      candidates: data?.candidates ?? [],
      confidence: data?.confidence,
    };

    logger.info('Receipt scan succeeded', {
      detectedAmountCents: result.detectedAmountCents,
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
