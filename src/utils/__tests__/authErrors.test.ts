import { describe, expect, it } from 'vitest';

import { isJwtTimingError } from '../authErrors';

describe('authErrors', () => {
  it('detects JWT issued at future errors', () => {
    expect(isJwtTimingError(new Error('JWT issued at future'))).toBe(true);
  });

  it('detects expired JWT errors', () => {
    expect(isJwtTimingError({ message: 'JWT expired' })).toBe(true);
  });

  it('detects invalid JWT errors', () => {
    expect(isJwtTimingError({ message: 'invalid JWT' })).toBe(true);
  });

  it('detects refresh token errors', () => {
    expect(isJwtTimingError({ message: 'refresh_token_not_found' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isJwtTimingError(new Error('Network request failed'))).toBe(false);
  });
});
