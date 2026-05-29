import { describe, expect, it } from 'vitest';

import { classifyReceiptScanError, RECEIPT_SCAN_MESSAGES, mapReceiptScanServerErrorCode } from '../receiptScanErrors';

describe('receiptScanErrors', () => {
  it('classifies missing OCR config', () => {
    const error = classifyReceiptScanError(new Error('Receipt scanning is not configured yet.'));
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.notConfigured);
    expect(error.code).toBe('not_configured');
  });

  it('maps server OCR_NOT_CONFIGURED', () => {
    const error = mapReceiptScanServerErrorCode('OCR_NOT_CONFIGURED');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.notConfigured);
    expect(error.serverErrorCode).toBe('OCR_NOT_CONFIGURED');
  });

  it('maps server OPENAI_UNAUTHORIZED with server message', () => {
    const error = mapReceiptScanServerErrorCode(
      'OPENAI_UNAUTHORIZED',
      'Receipt scanning is not configured correctly.',
      { providerStatus: 401 },
    );
    expect(error.message).toBe('Receipt scanning is not configured correctly.');
    expect(error.code).toBe('not_configured_correctly');
    expect(error.serverErrorCode).toBe('OPENAI_UNAUTHORIZED');
    expect(error.providerStatus).toBe(401);
  });

  it('maps server OPENAI_RATE_LIMITED', () => {
    const error = mapReceiptScanServerErrorCode('OPENAI_RATE_LIMITED', undefined, { providerStatus: 429 });
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.rateLimited);
    expect(error.code).toBe('rate_limited');
    expect(error.serverErrorCode).toBe('OPENAI_RATE_LIMITED');
  });

  it('maps server OPENAI_QUOTA_EXCEEDED', () => {
    const error = mapReceiptScanServerErrorCode('OPENAI_QUOTA_EXCEEDED');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.quotaExceeded);
    expect(error.code).toBe('quota_exceeded');
  });

  it('maps server OPENAI_BAD_REQUEST', () => {
    const error = mapReceiptScanServerErrorCode('OPENAI_BAD_REQUEST');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.badRequest);
    expect(error.code).toBe('bad_request');
  });

  it('maps server OPENAI_REQUEST_FAILED', () => {
    const error = mapReceiptScanServerErrorCode('OPENAI_REQUEST_FAILED');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.ocrFailed);
    expect(error.serverErrorCode).toBe('OPENAI_REQUEST_FAILED');
  });

  it('maps server OPENAI_INVALID_RESPONSE', () => {
    const error = mapReceiptScanServerErrorCode('OPENAI_INVALID_RESPONSE');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.invalidResponse);
  });

  it('maps server INVALID_IMAGE', () => {
    const error = mapReceiptScanServerErrorCode('INVALID_IMAGE');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.invalidImage);
  });

  it('maps server REQUEST_BODY_INVALID', () => {
    const error = mapReceiptScanServerErrorCode('REQUEST_BODY_INVALID');
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.missingImage);
  });

  it('maps server UNKNOWN_OCR_ERROR', () => {
    const error = mapReceiptScanServerErrorCode('UNKNOWN_OCR_ERROR', 'Custom failure message');
    expect(error.message).toBe('Custom failure message');
    expect(error.serverErrorCode).toBe('UNKNOWN_OCR_ERROR');
  });

  it('classifies undeployed function errors', () => {
    const error = classifyReceiptScanError(new Error('Failed to send a request to the Edge Function'));
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.notDeployed);
    expect(error.code).toBe('not_deployed');
  });

  it('classifies network failures', () => {
    const error = classifyReceiptScanError(new Error('Network request failed'));
    expect(error.message).toBe(RECEIPT_SCAN_MESSAGES.network);
    expect(error.code).toBe('network');
  });
});
