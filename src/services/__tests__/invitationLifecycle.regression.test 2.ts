import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isSplitSelectableMember } from '../../utils/groupParticipants';
import {
  createChainableQuery,
  type ChainableQuery,
} from './helpers/supabaseQueryMock';

const { getUser, invoke, from, findProfileByEmail, markInvitationNotificationsAsRead } = vi.hoisted(() => ({
  getUser: vi.fn(),
  invoke: vi.fn(),
  from: vi.fn(),
  findProfileByEmail: vi.fn(),
  markInvitationNotificationsAsRead: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    functions: { invoke },
    from,
  },
}));

vi.mock('../profileService', () => ({
  findProfileByEmail,
}));

vi.mock('../notificationService', () => ({
  markInvitationNotificationsAsRead,
  ensureInvitationNotification: vi.fn(),
}));

const now = '2026-05-29T00:00:00.000Z';

function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    group_id: 'group-1',
    user_id: null,
    email: 'new@example.com',
    display_name: 'new',
    nickname: 'new',
    role: 'member',
    invitation_status: 'pending',
    is_active: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    group_id: 'group-1',
    invited_by: 'owner-1',
    invited_email: 'new@example.com',
    invited_user_id: null,
    group_member_id: 'member-1',
    status: 'pending',
    token: 'token-xyz',
    message: null,
    expires_at: '2026-06-15T00:00:00.000Z',
    accepted_at: null,
    declined_at: null,
    email_sent_at: null,
    email_error: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function queueFromHandlers(...handlers: Array<() => ChainableQuery>) {
  from.mockImplementation(() => {
    const handler = handlers.shift();
    if (!handler) {
      throw new Error('Unexpected supabase.from() call');
    }
    return handler();
  });
}

describe('invitation lifecycle regression', () => {
  beforeEach(() => {
    vi.resetModules();
    getUser.mockReset();
    invoke.mockReset();
    from.mockReset();
    findProfileByEmail.mockReset();
    markInvitationNotificationsAsRead.mockReset();
    markInvitationNotificationsAsRead.mockResolvedValue(undefined);
  });

  describe('duplicate invitation rules', () => {
    it('hasDuplicateInviteEmailInGroup blocks active member emails', async () => {
      queueFromHandlers(
        () =>
          createChainableQuery({
            data: [
              {
                email: 'member@example.com',
                invitation_status: 'active',
                is_active: true,
                role: 'member',
              },
            ],
            error: null,
          }),
        () => createChainableQuery({ data: [], error: null }),
      );

      const { hasDuplicateInviteEmailInGroup } = await import('../invitationService');
      await expect(hasDuplicateInviteEmailInGroup('group-1', ['member@example.com'])).resolves.toBe(true);
    });

    it('hasDuplicateInviteEmailInGroup blocks pending invitation emails', async () => {
      queueFromHandlers(
        () => createChainableQuery({ data: [], error: null }),
        () =>
          createChainableQuery({
            data: [{ invited_email: 'pending@example.com' }],
            error: null,
          }),
      );

      const { hasDuplicateInviteEmailInGroup } = await import('../invitationService');
      await expect(hasDuplicateInviteEmailInGroup('group-1', ['pending@example.com'])).resolves.toBe(true);
    });

    it('hasDuplicateInviteEmailInGroup allows declined or cancelled emails per current rules', async () => {
      queueFromHandlers(
        () =>
          createChainableQuery({
            data: [
              {
                email: 'declined@example.com',
                invitation_status: 'declined',
                is_active: false,
                role: 'member',
              },
              {
                email: 'cancelled@example.com',
                invitation_status: 'cancelled',
                is_active: false,
                role: 'member',
              },
            ],
            error: null,
          }),
        () => createChainableQuery({ data: [], error: null }),
      );

      const { hasDuplicateInviteEmailInGroup } = await import('../invitationService');
      await expect(
        hasDuplicateInviteEmailInGroup('group-1', ['declined@example.com', 'cancelled@example.com']),
      ).resolves.toBe(false);
    });
  });

  describe('pending member lifecycle', () => {
    it('createGroupInvitation inserts pending group_members row for unregistered email', async () => {
      findProfileByEmail.mockResolvedValue(null);

      let memberInsert: ChainableQuery | undefined;
      let invitationInsert: ChainableQuery | undefined;

      queueFromHandlers(
        () => createChainableQuery({ data: null, error: null }),
        () => {
          memberInsert = createChainableQuery({ data: memberRow(), error: null });
          return memberInsert;
        },
        () => {
          invitationInsert = createChainableQuery({
            data: invitationRow(),
            error: null,
          });
          return invitationInsert;
        },
      );

      const { createGroupInvitation } = await import('../invitationService');
      const result = await createGroupInvitation({
        groupId: 'group-1',
        invitedBy: 'owner-1',
        invitedEmail: 'new@example.com',
      });

      expect(result.member.invitationStatus).toBe('pending');
      expect(result.member.isActive).toBe(false);
      expect(result.member.userId).toBeUndefined();
      expect(memberInsert?._insertPayload).toMatchObject({
        group_id: 'group-1',
        email: 'new@example.com',
        invitation_status: 'pending',
        is_active: false,
        user_id: null,
      });
      expect(invitationInsert?._insertPayload).toMatchObject({
        group_id: 'group-1',
        invited_email: 'new@example.com',
        status: 'pending',
        group_member_id: 'member-1',
      });
    });

    it('createGroupInvitation reuses declined member row when inviting again', async () => {
      findProfileByEmail.mockResolvedValue(null);

      let memberUpdate: ChainableQuery | undefined;

      queueFromHandlers(
        () =>
          createChainableQuery({
            data: memberRow({ id: 'member-declined', invitation_status: 'declined' }),
            error: null,
          }),
        () => {
          memberUpdate = createChainableQuery({
            data: memberRow({ id: 'member-declined', invitation_status: 'pending', is_active: false }),
            error: null,
          });
          return memberUpdate;
        },
        () =>
          createChainableQuery({
            data: invitationRow({ group_member_id: 'member-declined' }),
            error: null,
          }),
      );

      const { createGroupInvitation } = await import('../invitationService');
      const result = await createGroupInvitation({
        groupId: 'group-1',
        invitedBy: 'owner-1',
        invitedEmail: 'new@example.com',
      });

      expect(result.member.id).toBe('member-declined');
      expect(memberUpdate?._updatePayload).toMatchObject({
        invitation_status: 'pending',
        is_active: false,
      });
      expect(memberUpdate?._insertPayload).toBeUndefined();
    });

    it('acceptInvitation links pending group_member to auth user', async () => {
      getUser.mockResolvedValue({
        data: { user: { id: 'user-friend', email: 'friend@example.com' } },
        error: null,
      });

      let memberActivate: ChainableQuery | undefined;

      queueFromHandlers(
        () =>
          createChainableQuery({
            data: invitationRow({
              invited_email: 'friend@example.com',
              group_member_id: 'member-pending',
            }),
            error: null,
          }),
        () => {
          memberActivate = createChainableQuery({ data: { id: 'member-pending' }, error: null });
          return memberActivate;
        },
        () => createChainableQuery({ data: null, error: null }),
        () => createChainableQuery({ data: { name: 'Weekend Trip' }, error: null }),
      );

      const { acceptInvitation } = await import('../invitationService');
      const result = await acceptInvitation('inv-1');

      expect(result).toEqual({
        invitationId: 'inv-1',
        groupId: 'group-1',
        groupName: 'Weekend Trip',
        groupMemberId: 'member-pending',
      });
      expect(memberActivate?._updatePayload).toMatchObject({
        user_id: 'user-friend',
        email: 'friend@example.com',
        invitation_status: 'active',
        is_active: true,
      });
      expect(markInvitationNotificationsAsRead).toHaveBeenCalledWith('inv-1');
    });

    it('declineInvitation marks member declined and excludes them from split selectors', async () => {
      let memberDecline: ChainableQuery | undefined;

      queueFromHandlers(
        () =>
          createChainableQuery({
            data: invitationRow({ group_member_id: 'member-pending' }),
            error: null,
          }),
        () => createChainableQuery({ data: null, error: null }),
        () => {
          memberDecline = createChainableQuery({ data: null, error: null });
          return memberDecline;
        },
      );

      const { declineInvitation } = await import('../invitationService');
      await declineInvitation('inv-1');

      expect(memberDecline?._updatePayload).toEqual({
        invitation_status: 'declined',
        is_active: false,
      });
      expect(
        isSplitSelectableMember({
          role: 'member',
          invitationStatus: 'declined',
          isActive: false,
        }),
      ).toBe(false);
    });

    it('cancelInvitation marks member cancelled and excludes them from split selectors', async () => {
      getUser.mockResolvedValue({
        data: { user: { id: 'owner-1', email: 'owner@example.com' } },
        error: null,
      });

      let memberCancel: ChainableQuery | undefined;

      queueFromHandlers(
        () =>
          createChainableQuery({
            data: invitationRow({ invited_by: 'owner-1', group_member_id: 'member-pending' }),
            error: null,
          }),
        () => createChainableQuery({ data: { owner_id: 'owner-1' }, error: null }),
        () => createChainableQuery({ data: null, error: null }),
        () => {
          memberCancel = createChainableQuery({ data: null, error: null });
          return memberCancel;
        },
      );

      const { cancelInvitation } = await import('../invitationService');
      await cancelInvitation('inv-1');

      expect(memberCancel?._updatePayload).toEqual({
        invitation_status: 'cancelled',
        is_active: false,
      });
      expect(
        isSplitSelectableMember({
          role: 'member',
          invitationStatus: 'cancelled',
          isActive: false,
        }),
      ).toBe(false);
    });
  });

  describe('email behavior', () => {
    it('inviteMoreMembers continues after partial email failure and returns warnings', async () => {
      getUser.mockResolvedValue({
        data: { user: { id: 'owner-1', email: 'owner@example.com' } },
        error: null,
      });
      findProfileByEmail.mockResolvedValue(null);

      const handlers: Array<() => ChainableQuery> = [
        () => createChainableQuery({ data: { owner_id: 'owner-1' }, error: null }),
        () => createChainableQuery({ data: [], error: null }),
        () => createChainableQuery({ data: [], error: null }),
        () => createChainableQuery({ data: null, error: null }),
        () => createChainableQuery({ data: memberRow({ id: 'member-a', email: 'a@example.com' }), error: null }),
        () =>
          createChainableQuery({
            data: invitationRow({ id: 'inv-a', invited_email: 'a@example.com', group_member_id: 'member-a' }),
            error: null,
          }),
        () => createChainableQuery({ data: null, error: null }),
        () =>
          createChainableQuery({
            data: memberRow({ id: 'member-b', email: 'bob@example.com' }),
            error: null,
          }),
        () =>
          createChainableQuery({
            data: invitationRow({ id: 'inv-b', invited_email: 'bob@example.com', group_member_id: 'member-b' }),
            error: null,
          }),
      ];
      queueFromHandlers(...handlers);

      invoke
        .mockResolvedValueOnce({ data: { emailSent: true }, error: null })
        .mockResolvedValueOnce({ data: { reason: 'SMTP unavailable' }, error: null });

      const { inviteMoreMembers } = await import('../invitationService');
      const result = await inviteMoreMembers('group-1', ['a@example.com', 'bob@example.com']);

      expect(result.invitations).toHaveLength(2);
      expect(result.members).toHaveLength(2);
      expect(result.emailResults).toEqual([
        { invitationId: 'inv-a', sent: true },
        { invitationId: 'inv-b', sent: false, error: 'SMTP unavailable' },
      ]);
      expect(result.warnings).toEqual([
        'Invitation for b***@example.com was created, but email could not be sent. You can resend it later.',
      ]);
    });
  });
});
