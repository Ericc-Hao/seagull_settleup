import { describe, expect, it } from 'vitest';

import {
  buildGroupEmailOccupancy,
  classifyInviteDuplicate,
  duplicateInviteWarning,
  isBlockingGroupMember,
} from '../invitationDuplicateRules';

describe('invitationDuplicateRules', () => {
  it('blocks active members and pending placeholders only', () => {
    expect(
      isBlockingGroupMember({
        email: 'active@example.com',
        invitation_status: 'active',
        is_active: true,
      }),
    ).toBe(true);
    expect(
      isBlockingGroupMember({
        email: 'pending@example.com',
        invitation_status: 'pending',
        is_active: false,
      }),
    ).toBe(true);
    expect(
      isBlockingGroupMember({
        email: 'cancelled@example.com',
        invitation_status: 'cancelled',
        is_active: false,
      }),
    ).toBe(false);
    expect(
      isBlockingGroupMember({
        email: 'declined@example.com',
        invitation_status: 'declined',
        is_active: false,
      }),
    ).toBe(false);
  });

  it('allows re-inviting cancelled or declined emails', () => {
    const occupancy = buildGroupEmailOccupancy(
      [
        {
          email: 'cancelled@example.com',
          invitation_status: 'cancelled',
          is_active: false,
        },
        {
          email: 'declined@example.com',
          invitation_status: 'declined',
          is_active: false,
        },
      ],
      [],
    );

    expect(classifyInviteDuplicate('cancelled@example.com', occupancy)).toBeNull();
    expect(classifyInviteDuplicate('declined@example.com', occupancy)).toBeNull();
  });

  it('blocks duplicate active members and pending invitations', () => {
    const occupancy = buildGroupEmailOccupancy(
      [
        {
          email: 'member@example.com',
          invitation_status: 'active',
          is_active: true,
        },
        {
          email: 'pending@example.com',
          invitation_status: 'pending',
          is_active: false,
        },
      ],
      ['pending@example.com'],
    );

    expect(classifyInviteDuplicate('member@example.com', occupancy)).toBe('active_member');
    expect(classifyInviteDuplicate('pending@example.com', occupancy)).toBe('pending_invitation');
    expect(duplicateInviteWarning('active_member')).toBe('This email is already a member of this group.');
    expect(duplicateInviteWarning('pending_invitation')).toBe(
      'This email already has a pending invitation. You can resend the reminder email.',
    );
  });
});
