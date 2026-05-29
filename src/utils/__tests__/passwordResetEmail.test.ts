import { describe, expect, it } from 'vitest';

import { buildPasswordResetEmail } from '../../../supabase/functions/_shared/emailTemplates';

describe('buildPasswordResetEmail', () => {
  it('builds branded reset email content', () => {
    const email = buildPasswordResetEmail({
      resetLink: 'https://split.seagullcoffee.ca/reset-password?code=abc',
      recipientEmail: 'user@example.com',
    });

    expect(email.subject).toBe('Reset your Seagull Split password');
    expect(email.text).toContain('We received a request to reset your password.');
    expect(email.text).toContain('confirm on the reset page to choose a new password.');
    expect(email.text).toContain('https://split.seagullcoffee.ca/reset-password?code=abc');
    expect(email.html).toContain('Reset Password');
    expect(email.html).toContain('user@example.com');
    expect(email.text).toContain('If you did not request this, you can ignore this email.');
  });
});
