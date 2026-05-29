import { describe, expect, it } from 'vitest';

import {
  hasRecoveryCodeInUrl,
  isExpiredRecoveryError,
  isRecoveryLinkExpiredError,
  parseRecoveryLinkErrorFromUrl,
  parseRecoveryTokenHashFromUrl,
  RECOVERY_LINK_EXPIRED_MESSAGE,
} from '../authService';

describe('parseRecoveryLinkErrorFromUrl', () => {
  it('reads otp_expired from hash fragment', () => {
    expect(
      parseRecoveryLinkErrorFromUrl(
        'https://split.seagullcoffee.ca/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
  });

  it('returns null when no auth error is present', () => {
    expect(
      parseRecoveryLinkErrorFromUrl('https://split.seagullcoffee.ca/reset-password?code=abc123'),
    ).toBeNull();
  });
});

describe('parseRecoveryTokenHashFromUrl', () => {
  it('reads token_hash recovery params from URL', () => {
    expect(
      parseRecoveryTokenHashFromUrl(
        'https://split.seagullcoffee.ca/reset-password?token_hash=abc123&type=recovery',
      ),
    ).toBe('abc123');
  });

  it('returns null when type is not recovery', () => {
    expect(
      parseRecoveryTokenHashFromUrl(
        'https://split.seagullcoffee.ca/reset-password?token_hash=abc123&type=signup',
      ),
    ).toBeNull();
  });
});

describe('hasRecoveryCodeInUrl', () => {
  it('detects PKCE code param', () => {
    expect(
      hasRecoveryCodeInUrl('https://split.seagullcoffee.ca/reset-password?code=abc123'),
    ).toBe(true);
  });
});

describe('recovery link expiry helpers', () => {
  it('detects otp_expired from parsed URL error', () => {
    expect(
      isRecoveryLinkExpiredError({
        errorCode: 'otp_expired',
        errorDescription: 'Email link is invalid or has expired',
      }),
    ).toBe(true);
  });

  it('detects expired recovery errors from thrown messages', () => {
    expect(isExpiredRecoveryError(new Error('otp_expired'))).toBe(true);
    expect(isExpiredRecoveryError(new Error('Email link is invalid or has expired'))).toBe(true);
  });

  it('uses the expected user-facing expired message', () => {
    expect(RECOVERY_LINK_EXPIRED_MESSAGE).toBe(
      'This reset link is invalid or has expired. Please request a new password reset email.',
    );
  });
});
