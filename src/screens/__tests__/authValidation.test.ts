import { describe, expect, it } from 'vitest';

import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from '../auth/authValidation';

describe('authValidation', () => {
  it('validateRequired returns label-specific message', () => {
    expect(validateRequired('', 'Email')).toBe('Email is required.');
    expect(validateRequired('  ', 'Display name')).toBe('Display name is required.');
    expect(validateRequired('Eric', 'Display name')).toBeNull();
  });

  it('validateEmail checks format for forgot-password flow', () => {
    expect(validateEmail('not-an-email')).toBe('Please enter a valid email address.');
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('validatePassword enforces minimum length', () => {
    expect(validatePassword('12345')).toBe('Password should be at least 6 characters.');
    expect(validatePassword('123456')).toBeNull();
  });

  it('validatePasswordConfirmation requires matching passwords', () => {
    expect(validatePasswordConfirmation('abc123', 'abc124')).toBe(
      'Password and confirm password must match.',
    );
    expect(validatePasswordConfirmation('abc123', 'abc123')).toBeNull();
  });

  it('normalizeEmail lowercases and trims', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
});
