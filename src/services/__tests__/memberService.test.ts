import { describe, expect, it } from 'vitest';

import { partitionMembers } from '../memberService';
import type { GroupMemberWithProfile } from '../../types/views';

function member(
  overrides: Partial<GroupMemberWithProfile> & Pick<GroupMemberWithProfile, 'id' | 'invitationStatus'>,
): GroupMemberWithProfile {
  return {
    groupId: 'group-1',
    displayName: 'Test',
    role: 'member',
    avatarLabel: 'T',
    isRegistered: false,
    isActive: overrides.invitationStatus === 'active',
    ...overrides,
  };
}

describe('partitionMembers', () => {
  it('shows pending members only in pending section', () => {
    const pending = member({
      id: 'pending-1',
      invitationStatus: 'pending',
      isActive: false,
    });

    const { pending: pendingMembers, inactive } = partitionMembers([pending]);

    expect(pendingMembers).toHaveLength(1);
    expect(inactive).toHaveLength(0);
  });

  it('shows cancelled members in inactive section only', () => {
    const cancelled = member({
      id: 'cancelled-1',
      invitationStatus: 'cancelled',
      isActive: false,
    });

    const { pending, inactive } = partitionMembers([cancelled]);

    expect(pending).toHaveLength(0);
    expect(inactive).toHaveLength(1);
  });
});
