import { describe, expect, it } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import type { DatabaseSnapshot } from '../../storage/types';
import type { Group, GroupMember } from '../../types/models';
import {
  getAccessibleGroupsForUser,
  isActiveGroupStatus,
  isActiveMembership,
  isGroupActiveForNewExpenses,
  isGroupInactive,
  canMutateGroup,
  INACTIVE_GROUP_EXPENSE_MESSAGE,
  INACTIVE_GROUP_MUTATION_MESSAGE,
  userHasGroupAccess,
} from '../groupAccess';
import { getExpenseSelectableGroupOptions } from '../groupService';

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

  it('treats inactive status as not active for new expenses', () => {
    const active = group({ id: 'group-active', status: 'active' });
    const inactive = group({ id: 'group-inactive', status: 'inactive' });

    expect(isActiveGroupStatus('active')).toBe(true);
    expect(isActiveGroupStatus('planning')).toBe(true);
    expect(isActiveGroupStatus('inactive')).toBe(false);
    expect(isGroupInactive(inactive)).toBe(true);
    expect(isGroupInactive(active)).toBe(false);
    expect(isGroupActiveForNewExpenses(active)).toBe(true);
    expect(isGroupActiveForNewExpenses(inactive)).toBe(false);
    expect(INACTIVE_GROUP_EXPENSE_MESSAGE).toContain('inactive');
  });

  it('excludes inactive groups from expense selectors but keeps them accessible', () => {
    const db = snapshot({
      groups: [
        group({ id: 'group-active', ownerId: 'user-a', status: 'active' }),
        group({ id: 'group-inactive', ownerId: 'user-a', status: 'inactive' }),
      ],
      groupMembers: [],
    });
    setCache(db);
    setCachedUserId('user-a');

    expect(getAccessibleGroupsForUser('user-a', db).map((entry) => entry.id).sort()).toEqual([
      'group-active',
      'group-inactive',
    ]);
    expect(getExpenseSelectableGroupOptions('user-a').map((entry) => entry.id)).toEqual(['group-active']);
  });

  it('canMutateGroup returns false when group is inactive', () => {
    expect(canMutateGroup(group({ id: 'group-inactive', status: 'inactive' }))).toBe(false);
    expect(canMutateGroup(group({ id: 'group-active', status: 'active' }))).toBe(true);
    expect(canMutateGroup(group({ id: 'group-planning', status: 'planning' }))).toBe(true);
  });
});
