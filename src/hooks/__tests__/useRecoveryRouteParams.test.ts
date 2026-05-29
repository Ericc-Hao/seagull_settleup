import { describe, expect, it } from 'vitest';

import {
  parseRecoveryLinkErrorFromUrl,
  parseRecoveryTokenHashFromUrl,
} from '../../services/authService';

describe('parseRecoveryTokenHashFromUrl', () => {
  it('reads token_hash recovery params from HTTPS universal link URLs', () => {
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

describe('parseRecoveryLinkErrorFromUrl', () => {
  it('reads recovery link errors from hash params', () => {
    expect(
      parseRecoveryLinkErrorFromUrl(
        'https://split.seagullcoffee.ca/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      ),
    ).toEqual({
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
  });
});
