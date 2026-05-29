import { getCachedUserId } from '../lib/auth';
import { mapGroup } from '../lib/mappers';
import { GROUP_COLUMNS } from '../lib/queryColumns';
import { supabase } from '../lib/supabase';
import type { DatabaseSnapshot } from '../storage/types';
import type { Group, GroupMember } from '../types/models';
import { createLogger } from '../utils/logger';
import { findMemberForUser, readDb } from './dbHelpers';

const logger = createLogger('groupAccess');

const MEMBERSHIP_GROUP_SELECT = `group_id, user_id, invitation_status, is_active, role, groups (${GROUP_COLUMNS})`;

type MembershipGroupRow = {
  group_id: string;
  user_id: string | null;
  invitation_status: string;
  is_active: boolean | null;
  role: string | null;
  groups: Record<string, unknown> | Record<string, unknown>[] | null;
};

export function isActiveGroupStatus(status: Group['status']): boolean {
  return status === 'active' || status === 'planning' || status === 'ready_to_settle';
}

export function isGroupInactive(group: Pick<Group, 'status'>): boolean {
  return group.status === 'inactive';
}

export function isGroupActiveForNewExpenses(group: Pick<Group, 'status'>): boolean {
  return isActiveGroupStatus(group.status);
}

export const INACTIVE_GROUP_EXPENSE_MESSAGE =
  'This group is inactive. Reactivate it before adding new expenses.';

export const INACTIVE_GROUP_MUTATION_MESSAGE =
  'This group is inactive. Reactivate it before making changes.';

/** False when the group is inactive — blocks edit, invite, settle, and new expenses. */
export function canMutateGroup(group: Pick<Group, 'status'>): boolean {
  return !isGroupInactive(group);
}

/** Groups list card status badge label. */
export function getGroupCardStatusLabel(status: Group['status']): string {
  if (status === 'inactive') {
    return 'Inactive';
  }
  if (status === 'ready_to_settle') {
    return 'Not Settled';
  }
  return 'Active';
}

export function isActiveMembership(member: GroupMember | undefined): boolean {
  if (!member) {
    return false;
  }
  if (member.isActive === false) {
    return false;
  }
  const status = member.invitationStatus;
  return (
    status !== 'pending' &&
    status !== 'declined' &&
    status !== 'cancelled' &&
    status !== 'removed'
  );
}

export function userHasGroupAccess(
  group: Group,
  userId: string,
  db: DatabaseSnapshot = readDb(),
): boolean {
  if (group.deletedAt) {
    return false;
  }

  if (group.ownerId === userId) {
    return true;
  }

  const member = findMemberForUser(group.id, userId, db);
  return isActiveMembership(member);
}

export function getAccessibleGroupsForUser(
  userId: string = getCachedUserId(),
  db: DatabaseSnapshot = readDb(),
): Group[] {
  return db.groups.filter((group) => userHasGroupAccess(group, userId, db));
}

function mergeUniqueGroups(groups: Group[]): Group[] {
  const byId = new Map<string, Group>();
  for (const group of groups) {
    if (!group.deletedAt) {
      byId.set(group.id, group);
    }
  }
  return Array.from(byId.values());
}

function mapMembershipGroups(rows: MembershipGroupRow[] | null | undefined): Group[] {
  const groups: Group[] = [];

  for (const row of rows ?? []) {
    const nested = row.groups;
    if (!nested) {
      continue;
    }

    const groupRow = Array.isArray(nested) ? nested[0] : nested;
    if (!groupRow) {
      continue;
    }

    groups.push(mapGroup(groupRow as unknown as Parameters<typeof mapGroup>[0]));
  }

  return groups;
}

export async function fetchGroupsForCurrentUser(userId: string): Promise<Group[]> {
  logger.info('Fetch membership groups started', { table: 'group_members', userId });

  const [membershipsRes, ownedGroupsRes] = await Promise.all([
    supabase
      .from('group_members')
      .select(MEMBERSHIP_GROUP_SELECT)
      .eq('user_id', userId)
      .eq('invitation_status', 'active')
      .eq('is_active', true),
    supabase.from('groups').select(GROUP_COLUMNS).eq('owner_id', userId).is('deleted_at', null),
  ]);

  if (membershipsRes.error) {
    logger.error('Fetch membership groups failed', membershipsRes.error, {
      table: 'group_members',
      userId,
    });
    throw membershipsRes.error;
  }

  if (ownedGroupsRes.error) {
    logger.error('Fetch owned groups failed', ownedGroupsRes.error, { table: 'groups', userId });
    throw ownedGroupsRes.error;
  }

  const groups = mergeUniqueGroups([
    ...mapMembershipGroups(membershipsRes.data as MembershipGroupRow[] | null),
    ...(ownedGroupsRes.data ?? []).map(mapGroup),
  ]);

  logger.info('Fetch membership groups succeeded', { table: 'group_members', userId, count: groups.length });
  return groups;
}
