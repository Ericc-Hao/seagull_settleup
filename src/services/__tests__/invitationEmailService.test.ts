import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

describe('invitationEmailService', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('returns sent false with error when Edge Function invoke fails', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Network unavailable' },
    });

    const { sendInvitationEmail } = await import('../invitations/invitationEmailService');
    const result = await sendInvitationEmail('inv-1');

    expect(result).toEqual({
      invitationId: 'inv-1',
      sent: false,
      error: 'Network unavailable',
    });
  });

  it('returns sent false when invoke throws instead of rejecting the caller', async () => {
    invoke.mockRejectedValue(new Error('Function timeout'));

    const { sendInvitationEmail } = await import('../invitations/invitationEmailService');
    const result = await sendInvitationEmail('inv-2');

    expect(result).toEqual({
      invitationId: 'inv-2',
      sent: false,
      error: 'Function timeout',
    });
  });

  it('returns sent true when payload reports emailSent', async () => {
    invoke.mockResolvedValue({
      data: { emailSent: true },
      error: null,
    });

    const { sendInvitationEmail } = await import('../invitations/invitationEmailService');
    const result = await sendInvitationEmail('inv-3');

    expect(result).toEqual({ invitationId: 'inv-3', sent: true });
    expect(invoke).toHaveBeenCalledWith('send-group-invitation', {
      body: { invitationId: 'inv-3' },
    });
  });

  it('returns sent false with provider error when payload does not confirm delivery', async () => {
    invoke.mockResolvedValue({
      data: { success: false, reason: 'Resend rate limited' },
      error: null,
    });

    const { sendInvitationEmail } = await import('../invitations/invitationEmailService');
    const result = await sendInvitationEmail('inv-4');

    expect(result).toEqual({
      invitationId: 'inv-4',
      sent: false,
      error: 'Resend rate limited',
    });
  });
});
