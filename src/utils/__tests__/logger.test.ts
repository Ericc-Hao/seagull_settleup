import { describe, expect, it } from 'vitest';

import { sanitizeContext } from '../logger';
import { maskEmail } from '../validation';

describe('logger utilities', () => {
  it('masks email addresses in context', () => {
    expect(maskEmail('eric@example.com')).toBe('e***@example.com');
  });

  it('redacts sensitive keys', () => {
    const sanitized = sanitizeContext({
      groupId: 'g1',
      password: 'secret',
      access_token: 'abc',
      email: 'user@example.com',
    });

    expect(sanitized).toEqual({
      groupId: 'g1',
      password: '[redacted]',
      access_token: '[redacted]',
      email: 'u***@example.com',
    });
  });

  it('redacts session-like objects', () => {
    const sanitized = sanitizeContext({
      authPayload: { access_token: 'token', refresh_token: 'refresh' },
    });

    expect(sanitized?.authPayload).toBe('[redacted session object]');
  });
});
