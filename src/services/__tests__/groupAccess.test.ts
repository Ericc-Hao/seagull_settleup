import { describe, expect, it } from 'vitest';

import type { DatabaseSnapshot } from '../../storage/types';
import type { Group, GroupMember } from '../../types/models';
import {
  getAccessibleGroupsForUser,
  isActiveMembership,
  userHasGroupAccess,
} from '../groupAccess';

function group(overrides: Partial<Group> & Pick<Group, 'id'>): Group {
  return {
    name: 'Trip',
    type: 'Trip',
    currency: 'CAD',
    startDate: '2026-01-01',
    endDate: null,
    settlementMode: 'individual',
    status: 'active',
    ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function member(overrides: Partial<GroupMember> & Pick<GroupMember, 'id' | 'groupId'>): GroupMember {
  return {
    displayName: 'Member',
    role: 'member',
    invitationStatus: 'active',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function snapshot(partial: Partial<DatabaseSnapshot>): DatabaseSnapshot {
  return {
    users: [],
    profiles: [],
    groups: [],
    groupMembers: [],
    groupInvitations: [],
    teams: [],
    teamMembers: [],
    expenses: [],
    expenseSplits: [],
    settlements: [],
    receipts: [],
    categories: [],
    ...partial,
  };
}

describe('groupAccess', () => {
  it('includes groups owned by the current user', () => {
    const db = snapshot({
      groups: [group({ id: 'group-1', ownerId: 'user-a' })],
      groupMembers: [],
    });

    expect(userHasGroupAccess(db.groups[0], 'user-a', db)).toBe(true);
    expect(getAccessibleGroupsForUser('user-a', db).map((entry) => entry.id)).toEqual(['group-1']);
  });

  it('includes groups where the user is an active member', () => {
    const db = snapshot({
      groups: [group({ id: 'group-2', ownerId: 'owner-1' })],
      groupMembers: [member({ id: 'member-1', groupId: 'group-2', userId: 'user-b' })],
    });

    expect(getAccessibleGroupsForUser('user-b', db).map((entry) => entry.id)).toEqual(['group-2']);
  });

  it('excludes pending invited memberships and deleted groups', () => {
    const db = snapshot({
      groups: [
        group({ id: 'group-pending', ownerId: 'owner-1' }),
        group({ id: 'group-deleted', ownerId: 'owner-1', deletedAt: '2026-02-01T00:00:00.000Z' }),
      ],
      groupMembers: [
        member({
          id: 'member-pending',
          groupId: 'group-pending',
          userId: 'user-b',
          invitationStatus: 'pending',
          isActive: false,
        }),
        member({ id: 'member-deleted', groupId: 'group-deleted', userId: 'user-b' }),
      ],
    });

    expect(isActiveMembership(db.groupMembers[0])).toBe(false);
    expect(getAccessibleGroupsForUser('user-b', db)).toEqual([]);
  });
});
