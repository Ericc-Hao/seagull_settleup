import { getErrorMessage } from './errors';

export const RECEIPT_SCAN_MESSAGES = {
  notConfigured: 'Receipt scanning is not configured yet.',
  notConfiguredCorrectly: 'Receipt scanning is not configured correctly. Please enter the amount manually.',
  notDeployed:
    'Receipt scanning is unavailable right now. Please enter the amount manually or try again later.',
  network: 'Network error. Check your connection and try again.',
  ocrFailed: 'Receipt scanning failed. Please try again or enter the amount manually.',
  rateLimited:
    'Receipt scanning is temporarily rate limited. Please try again later or enter the amount manually.',
  quotaExceeded:
    'Receipt scanning is unavailable because the OCR quota has been reached. Please enter the amount manually.',
  badRequest:
    'Receipt image could not be processed. Please try another image or enter the amount manually.',
  invalidResponse: 'We could not read the receipt result. Please enter the amount manually.',
  invalidImage: 'Could not read the receipt image. Please try another image.',
  missingImage: 'Receipt image is missing. Please upload or take a photo again.',
  noAmount: 'We could not detect the total. Please enter the amount manually.',
  cameraPermission: 'Camera permission is required to take a receipt photo.',
  libraryPermission: 'Photo library permission is required to upload a receipt image.',
  missingImageData: 'Receipt scanning failed. Please try again or enter the amount manually.',
  amountRequired: 'Please enter an amount before continuing.',
  currencyNotDetected:
    'We detected the amount, but not the currency. Please select the receipt currency.',
  exchangeRateUnavailable:
    'Could not fetch the exchange rate. Please enter the amount manually.',
  unsupportedCurrency:
    'This currency is not supported yet. Please enter the amount manually.',
} as const;

export type ReceiptScanErrorCode =
  | 'not_configured'
  | 'not_configured_correctly'
  | 'not_deployed'
  | 'network'
  | 'ocr_failed'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'bad_request'
  | 'invalid_response'
  | 'invalid_image'
  | 'missing_image'
  | 'no_amount'
  | 'permission_denied'
  | 'missing_image_data'
  | 'currency_not_detected'
  | 'exchange_rate_unavailable'
  | 'unsupported_currency';

export class ReceiptScanError extends Error {
  readonly code: ReceiptScanErrorCode;
  readonly serverErrorCode?: string;
  readonly providerStatus?: number;

  constructor(
    message: string,
    code: ReceiptScanErrorCode,
    options?: { serverErrorCode?: string; providerStatus?: number },
  ) {
    super(message);
    this.name = 'ReceiptScanError';
    this.code = code;
    this.serverErrorCode = options?.serverErrorCode;
    this.providerStatus = options?.providerStatus;
  }
}

const EXPECTED_CODES = new Set<ReceiptScanErrorCode>([
  'not_configured',
  'not_configured_correctly',
  'not_deployed',
  'network',
  'ocr_failed',
  'rate_limited',
  'quota_exceeded',
  'bad_request',
  'invalid_response',
  'invalid_image',
  'missing_image',
  'no_amount',
  'permission_denied',
  'missing_image_data',
  'currency_not_detected',
  'exchange_rate_unavailable',
  'unsupported_currency',
]);

export function mapReceiptScanServerErrorCode(
  errorCode?: string,
  fallbackMessage?: string,
  options?: { providerStatus?: number },
): ReceiptScanError {
  const message = fallbackMessage?.trim();
  const meta = { serverErrorCode: errorCode, providerStatus: options?.providerStatus };

  switch (errorCode) {
    case 'OCR_NOT_CONFIGURED':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.notConfigured, 'not_configured', meta);
    case 'OPENAI_UNAUTHORIZED':
      return new ReceiptScanError(
        message ?? RECEIPT_SCAN_MESSAGES.notConfiguredCorrectly,
        'not_configured_correctly',
        meta,
      );
    case 'OPENAI_RATE_LIMITED':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.rateLimited, 'rate_limited', meta);
    case 'OPENAI_QUOTA_EXCEEDED':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.quotaExceeded, 'quota_exceeded', meta);
    case 'OPENAI_BAD_REQUEST':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.badRequest, 'bad_request', meta);
    case 'OPENAI_REQUEST_FAILED':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.ocrFailed, 'ocr_failed', meta);
    case 'OPENAI_INVALID_RESPONSE':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.invalidResponse, 'invalid_response', meta);
    case 'INVALID_IMAGE':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.invalidImage, 'invalid_image', meta);
    case 'REQUEST_BODY_INVALID':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.missingImage, 'missing_image', meta);
    case 'NO_AMOUNT_DETECTED':
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.noAmount, 'no_amount', meta);
    case 'CURRENCY_NOT_DETECTED':
      return new ReceiptScanError(
        message ?? RECEIPT_SCAN_MESSAGES.currencyNotDetected,
        'currency_not_detected',
        meta,
      );
    case 'EXCHANGE_RATE_UNAVAILABLE':
      return new ReceiptScanError(
        message ?? RECEIPT_SCAN_MESSAGES.exchangeRateUnavailable,
        'exchange_rate_unavailable',
        meta,
      );
    case 'UNSUPPORTED_CURRENCY':
      return new ReceiptScanError(
        message ?? RECEIPT_SCAN_MESSAGES.unsupportedCurrency,
        'unsupported_currency',
        meta,
      );
    case 'UNKNOWN_OCR_ERROR':
    case 'UNKNOWN':
    default:
      return new ReceiptScanError(message ?? RECEIPT_SCAN_MESSAGES.ocrFailed, 'ocr_failed', {
        ...meta,
        serverErrorCode: errorCode ?? 'UNKNOWN_OCR_ERROR',
      });
  }
}

export function isExpectedReceiptScanError(error: unknown): boolean {
  if (error instanceof ReceiptScanError) {
    return EXPECTED_CODES.has(error.code);
  }
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('receipt scanning is not configured') ||
    message.includes('receipt scanning failed') ||
    message.includes('receipt scanning is temporarily rate limited') ||
    message.includes('ocr quota has been reached') ||
    message.includes('receipt image could not be processed') ||
    message.includes('could not read the receipt') ||
    message.includes('could not detect the total') ||
    message.includes('receipt image is missing') ||
    message.includes('network error') ||
    message.includes('unavailable right now') ||
    message.includes('permission is required')
  );
}

export function classifyReceiptScanError(error: unknown): ReceiptScanError {
  if (error instanceof ReceiptScanError) {
    return error;
  }

  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('receipt scanning is not configured correctly')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.notConfiguredCorrectly, 'not_configured_correctly');
  }
  if (lower.includes('receipt scanning is not configured')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.notConfigured, 'not_configured');
  }
  if (lower.includes('temporarily rate limited')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.rateLimited, 'rate_limited');
  }
  if (lower.includes('ocr quota has been reached')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.quotaExceeded, 'quota_exceeded');
  }
  if (lower.includes('receipt image could not be processed')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.badRequest, 'bad_request');
  }
  if (lower.includes('receipt image is missing')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.missingImage, 'missing_image');
  }
  if (lower.includes('could not read the receipt image')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.invalidImage, 'invalid_image');
  }
  if (lower.includes('could not read the receipt result')) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.invalidResponse, 'invalid_response');
  }
  if (
    lower.includes('function not found') ||
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('failed to send a request') ||
    lower.includes('edge function')
  ) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.notDeployed, 'not_deployed');
  }
  if (
    lower.includes('network request failed') ||
    lower.includes('network error') ||
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('timeout')
  ) {
    return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.network, 'network');
  }

  return new ReceiptScanError(RECEIPT_SCAN_MESSAGES.ocrFailed, 'ocr_failed');
}
