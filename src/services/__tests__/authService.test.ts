import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

describe('recoverPassword', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('accepts successful edge function response without revealing account existence', async () => {
    invoke.mockResolvedValue({
      data: {
        ok: true,
        message: "If this email is registered, we'll send a password reset link.",
      },
      error: null,
    });

    const { recoverPassword } = await import('../../services/authService');
    await expect(recoverPassword('user@example.com')).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith('send-password-reset', {
      body: { email: 'user@example.com' },
    });
  });

  it('throws when edge function delivery fails', async () => {
    invoke.mockResolvedValue({
      data: { ok: false, error: 'Password reset is unavailable right now.' },
      error: null,
    });

    const { recoverPassword, PasswordRecoverySendError } = await import('../../services/authService');
    await expect(recoverPassword('user@example.com')).rejects.toBeInstanceOf(PasswordRecoverySendError);
  });
});
