import { describe, expect, it } from 'vitest';

import type { GroupMemberWithProfile } from '../../types/views';
import {
  filterSplitSelectableMembers,
  isBalanceEligibleMember,
  isActiveRegisteredMember,
  isPendingParticipant,
  isSplitSelectableMember,
  participantStatusLabel,
  toGroupParticipant,
} from '../groupParticipants';

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

describe('groupParticipants', () => {
  it('includes pending invited members as split selectable', () => {
    const pending = member({ id: 'm1', invitationStatus: 'pending', isActive: false, email: 'a@b.com' });
    expect(isSplitSelectableMember(pending)).toBe(true);
    expect(isBalanceEligibleMember(pending)).toBe(true);
    expect(filterSplitSelectableMembers([pending])).toHaveLength(1);
  });

  it('excludes declined and cancelled members from split selection', () => {
    const declined = member({ id: 'm2', invitationStatus: 'declined', isActive: false });
    const cancelled = member({ id: 'm3', invitationStatus: 'cancelled', isActive: false });
    expect(isSplitSelectableMember(declined)).toBe(false);
    expect(isSplitSelectableMember(cancelled)).toBe(false);
    expect(filterSplitSelectableMembers([declined, cancelled])).toHaveLength(0);
  });

  it('maps pending member to GroupParticipant', () => {
    const pending = member({
      id: 'm4',
      invitationStatus: 'pending',
      isActive: false,
      email: 'pending@example.com',
      displayName: 'pending',
    });
    const participant = toGroupParticipant(pending);
    expect(participant.status).toBe('pending');
    expect(participant.canBeSelectedForSplit).toBe(true);
    expect(participant.canBePaidBy).toBe(true);
    expect(participantStatusLabel(pending)).toBe('Pending');
  });

  it('includes active registered members', () => {
    const active = member({
      id: 'm5',
      invitationStatus: 'active',
      isActive: true,
      isRegistered: true,
      userId: 'user-1',
    });
    expect(isSplitSelectableMember(active)).toBe(true);
    expect(toGroupParticipant(active).status).toBe('active');
    expect(isPendingParticipant(active)).toBe(false);
    expect(isActiveRegisteredMember(active)).toBe(true);
    expect(participantStatusLabel(active)).toBeUndefined();
  });

  it('does not mark group owner as pending', () => {
    const owner = member({
      id: 'm6',
      invitationStatus: 'active',
      role: 'owner',
      isActive: true,
      isRegistered: true,
      userId: 'user-owner',
      displayName: 'Eric',
    });
    expect(isPendingParticipant(owner)).toBe(false);
    expect(isActiveRegisteredMember(owner)).toBe(true);
    expect(participantStatusLabel(owner)).toBeUndefined();
    expect(toGroupParticipant(owner).status).toBe('active');
  });

  it('marks only true pending invitees as pending', () => {
    const pending = member({
      id: 'm7',
      invitationStatus: 'pending',
      isActive: false,
      isRegistered: false,
      email: 'invite@example.com',
    });
    expect(isPendingParticipant(pending)).toBe(true);
    expect(participantStatusLabel(pending)).toBe('Pending');
  });
});
