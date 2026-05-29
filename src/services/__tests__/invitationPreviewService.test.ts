import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke,
    },
  },
}));

describe('invitationPreviewService', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('returns null for blank token without calling Edge Function', async () => {
    const { getInvitationPreviewByToken } = await import('../invitations/invitationPreviewService');

    await expect(getInvitationPreviewByToken('   ')).resolves.toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('maps successful preview payload to InvitationPreviewView shape', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        invitation: {
          invitationId: 'inv-preview',
          token: 'token-abc',
          groupId: 'group-1',
          groupName: 'Ski Trip',
          invitedEmail: 'friend@example.com',
          inviterName: 'Eric',
          inviterEmail: 'eric@example.com',
          status: 'pending',
          expiresAt: '2026-06-15T00:00:00.000Z',
          isValid: true,
          inviteeHasAccount: false,
        },
      },
      error: null,
    });

    const { getInvitationPreviewByToken } = await import('../invitations/invitationPreviewService');
    const preview = await getInvitationPreviewByToken('token-abc');

    expect(preview).toEqual({
      invitationId: 'inv-preview',
      token: 'token-abc',
      groupId: 'group-1',
      groupName: 'Ski Trip',
      inviterName: 'Eric',
      inviterEmail: 'eric@example.com',
      invitedEmail: 'friend@example.com',
      status: 'pending',
      expiresAt: '2026-06-15T00:00:00.000Z',
      isValid: true,
      inviteeHasAccount: false,
    });
    expect(invoke).toHaveBeenCalledWith('get-invitation-preview', {
      body: { token: 'token-abc' },
    });
  });

  it('returns null when Edge Function reports invitation not found', async () => {
    invoke.mockResolvedValue({
      data: { success: false, error: 'Invitation not found' },
      error: null,
    });

    const { getInvitationPreviewByToken } = await import('../invitations/invitationPreviewService');
    await expect(getInvitationPreviewByToken('missing-token')).resolves.toBeNull();
  });

  it('throws a safe error for other preview failures', async () => {
    invoke.mockResolvedValue({
      data: { success: false, error: 'Preview unavailable' },
      error: null,
    });

    const { getInvitationPreviewByToken } = await import('../invitations/invitationPreviewService');
    await expect(getInvitationPreviewByToken('bad-token')).rejects.toThrow('Preview unavailable');
  });

  it('supports legacy preview field alias', async () => {
    invoke.mockResolvedValue({
      data: {
        success: true,
        preview: {
          invitationId: 'inv-legacy',
          groupName: 'Legacy Group',
          invitedEmail: 'legacy@example.com',
          isValid: false,
          inviteeHasAccount: true,
        },
      },
      error: null,
    });

    const { getInvitationPreviewByToken } = await import('../invitations/invitationPreviewService');
    const preview = await getInvitationPreviewByToken('legacy-token');

    expect(preview?.invitationId).toBe('inv-legacy');
    expect(preview?.groupName).toBe('Legacy Group');
    expect(preview?.token).toBe('legacy-token');
    expect(preview?.status).toBe('cancelled');
    expect(preview?.isValid).toBe(false);
    expect(preview?.inviteeHasAccount).toBe(true);
  });
});
