import { describe, expect, it } from 'vitest';

import {
  isInvalidCredentialsError,
  isRecoverableAuthSessionError,
  toUserFriendlyAuthError,
} from '../authErrors';

describe('isRecoverableAuthSessionError', () => {
  it('detects AuthApiError refresh token message', () => {
    expect(
      isRecoverableAuthSessionError({
        name: 'AuthApiError',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      }),
    ).toBe(true);
  });

  it('detects invalid login credentials as non-recoverable session', () => {
    expect(isRecoverableAuthSessionError(new Error('Invalid login credentials'))).toBe(false);
  });
});

describe('isInvalidCredentialsError', () => {
  it('detects invalid login credentials', () => {
    expect(isInvalidCredentialsError(new Error('Invalid login credentials'))).toBe(true);
  });
});

describe('toUserFriendlyAuthError', () => {
  it('maps invalid login credentials', () => {
    expect(toUserFriendlyAuthError(new Error('Invalid login credentials'))).toBe('Invalid email or password.');
  });

  it('maps refresh token failures', () => {
    expect(toUserFriendlyAuthError(new Error('Invalid Refresh Token'))).toBe(
      'Your session expired. Please log in again.',
    );
    expect(toUserFriendlyAuthError(new Error('Refresh Token Not Found'))).toBe(
      'Your session expired. Please log in again.',
    );
  });

  it('maps network failures', () => {
    expect(toUserFriendlyAuthError(new Error('Network request failed'))).toBe(
      'Could not connect. Please check your network.',
    );
  });
});
