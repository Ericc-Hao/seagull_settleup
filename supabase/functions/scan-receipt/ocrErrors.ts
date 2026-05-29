export type OcrErrorCode =
  | 'OCR_NOT_CONFIGURED'
  | 'OPENAI_REQUEST_FAILED'
  | 'OPENAI_INVALID_RESPONSE'
  | 'OPENAI_RATE_LIMITED'
  | 'OPENAI_UNAUTHORIZED'
  | 'OPENAI_QUOTA_EXCEEDED'
  | 'OPENAI_BAD_REQUEST'
  | 'NO_AMOUNT_DETECTED'
  | 'INVALID_IMAGE'
  | 'REQUEST_BODY_INVALID'
  | 'UNKNOWN_OCR_ERROR';

export class OcrProviderError extends Error {
  code: OcrErrorCode;
  status?: number;

  constructor(code: OcrErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'OcrProviderError';
    this.code = code;
    this.status = status;
  }
}

export function userMessageForOcrError(code: OcrErrorCode): string {
  switch (code) {
    case 'OCR_NOT_CONFIGURED':
      return 'Receipt scanning is not configured yet.';
    case 'OPENAI_UNAUTHORIZED':
      return 'Receipt scanning is not configured correctly.';
    case 'OPENAI_RATE_LIMITED':
      return 'Receipt scanning is temporarily rate limited. Please try again later or enter the amount manually.';
    case 'OPENAI_QUOTA_EXCEEDED':
      return 'Receipt scanning is unavailable because the OCR quota has been reached. Please enter the amount manually.';
    case 'OPENAI_BAD_REQUEST':
      return 'Receipt image could not be processed. Please try another image or enter the amount manually.';
    case 'OPENAI_REQUEST_FAILED':
      return 'Receipt scanning failed. Please try again or enter the amount manually.';
    case 'OPENAI_INVALID_RESPONSE':
      return 'We could not read the receipt result. Please enter the amount manually.';
    case 'NO_AMOUNT_DETECTED':
      return 'We could not detect the total. Please enter the amount manually.';
    case 'INVALID_IMAGE':
      return 'Could not read the receipt image. Please try another image.';
    case 'REQUEST_BODY_INVALID':
      return 'Receipt image is missing. Please upload or take a photo again.';
    case 'UNKNOWN_OCR_ERROR':
    default:
      return 'Receipt scanning failed. Please enter the amount manually.';
  }
}

export function httpStatusForOcrError(code: OcrErrorCode): number {
  switch (code) {
    case 'OCR_NOT_CONFIGURED':
      return 503;
    case 'OPENAI_UNAUTHORIZED':
      return 502;
    case 'OPENAI_RATE_LIMITED':
    case 'OPENAI_QUOTA_EXCEEDED':
      return 429;
    case 'OPENAI_REQUEST_FAILED':
    case 'OPENAI_INVALID_RESPONSE':
    case 'OPENAI_BAD_REQUEST':
      return 502;
    case 'REQUEST_BODY_INVALID':
    case 'INVALID_IMAGE':
      return 400;
    case 'NO_AMOUNT_DETECTED':
      return 200;
    case 'UNKNOWN_OCR_ERROR':
    default:
      return 500;
  }
}

export function mapOpenAiHttpError(status: number, errorText: string): OcrErrorCode {
  switch (status) {
    case 400:
      return 'OPENAI_BAD_REQUEST';
    case 401:
      return 'OPENAI_UNAUTHORIZED';
    case 403:
      return 'OPENAI_REQUEST_FAILED';
    case 404:
      return 'OPENAI_BAD_REQUEST';
    case 429:
      return classify429Error(errorText);
    case 500:
    case 502:
    case 503:
      return 'OPENAI_REQUEST_FAILED';
    default:
      return 'OPENAI_REQUEST_FAILED';
  }
}

function classify429Error(errorText: string): OcrErrorCode {
  const lower = errorText.toLowerCase();
  if (
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('insufficient') ||
    lower.includes('exceeded your current')
  ) {
    return 'OPENAI_QUOTA_EXCEEDED';
  }
  return 'OPENAI_RATE_LIMITED';
}
