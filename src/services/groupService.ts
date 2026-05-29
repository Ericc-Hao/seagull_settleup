import { getCachedUserId } from '../lib/auth';
import { mapGroup, mapGroupMember } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import type {
  CreateGroupInput,
  CreateGroupWithInvitationsInput,
  CreateGroupWithInvitationsResult,
  UpdateGroupInput,
} from '../types/inputs';
import type { Group, GroupInvitation, GroupMember } from '../types/models';
import type { GroupCardView, GroupSelectorOption, GroupsSummaryView } from '../types/views';
import { GROUP_COLUMNS } from '../lib/queryColumns';
import { formatMonthYear } from '../utils/date';
import { createLogger } from '../utils/logger';
import { maskEmail, normalizeEmail } from '../utils/validation';
import {
  findMemberForUser,
  getGroupExpenses,
  getGroupMembers,
  readDb,
} from './dbHelpers';
import {
  fetchGroupsForCurrentUser,
  getAccessibleGroupsForUser,
  isActiveGroupStatus,
  isGroupInactive,
} from './groupAccess';
export {
  getAccessibleGroupsForUser,
  isGroupInactive,
  isGroupActiveForNewExpenses,
  canMutateGroup,
  INACTIVE_GROUP_EXPENSE_MESSAGE,
  INACTIVE_GROUP_MUTATION_MESSAGE,
} from './groupAccess';
import { createGroupInvitation, sendInvitationEmail } from './invitationService';
import { ensureProfileExists } from './profileService';
import { getCurrentUserGroupBalanceSummary } from './settlementService';

const logger = createLogger('groupService');
const GROUP_INVITATION_LINK_ERROR =
  'Group could not be created because the invitation link could not be generated. Please try again.';

export function getCurrentUserId(): string {
  return getCachedUserId();
}

export function getGroups(): Group[] {
  return readDb().groups;
}

export function getGroupById(groupId: string): Group | undefined {
  return readDb().groups.find((group) => group.id === groupId);
}

export async function fetchGroupById(groupId: string): Promise<Group | null> {
  logger.info('Loading group detail', { groupId, userId: getCurrentUserId() });
  try {
    const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      logger.warn('Group detail not found', { groupId, userId: getCurrentUserId() });
      return null;
    }
    const group = mapGroup(data);
    logger.info('Group detail loaded', { groupId });
    return group;
  } catch (error) {
    logger.error('Group detail load failed', error, { groupId, userId: getCurrentUserId() });
    throw error;
  }
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const ownerId = input.ownerId || getCurrentUserId();
  if (!ownerId) {
    throw new Error('You must be logged in to create a group.');
  }

  logger.info('Create group started', { table: 'groups', name: input.name, ownerId });

  try {
    const { data: groupRow, error: groupError } = await supabase.from('groups').insert({
      owner_id: ownerId,
      name: input.name,
      type: input.type,
      currency: input.currency ?? 'CAD',
      start_date: input.startDate,
      end_date: input.endDate,
      settlement_mode: input.settlementMode,
      status: input.status ?? 'active',
    }).select('*').single();
    if (groupError) {
      throw groupError;
    }
    const group = mapGroup(groupRow);
    logger.info('Group insert succeeded', { table: 'groups', groupId: group.id });

    const profile = await ensureProfileExists();
    const ownerEmail = profile?.email ?? null;
    const ownerName = profile?.displayName || ownerEmail?.split('@')[0] || 'Owner';

    const { error: membersError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: ownerId,
      email: ownerEmail,
      display_name: ownerName,
      nickname: ownerName,
      avatar_color: '#AAC4FF',
      role: 'owner',
      invitation_status: 'active',
      is_active: true,
    }).select('*').single();
    if (membersError) {
      throw membersError;
    }
    logger.info('Owner member insert succeeded', { table: 'group_members', groupId: group.id });

    logger.info('Create group succeeded', { table: 'groups', groupId: group.id });
    return getGroupById(group.id) ?? group;
  } catch (error) {
    logger.error('Create group failed', error, { table: 'groups', name: input.name });
    throw error;
  }
}

function normalizeInviteEmail(email: string): string {
  return normalizeEmail(email);
}

export async function createGroupWithInvitations(
  input: CreateGroupWithInvitationsInput,
): Promise<CreateGroupWithInvitationsResult> {
  logger.info('Create group with invitations started', {
    table: 'groups',
    name: input.name,
    invitedCount: input.invitedEmails.length,
  });

  let createdGroupId: string | undefined;
  let ownerUserId: string | undefined;

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const user = userData.user;
    if (!user) {
      throw new Error('You must be logged in to create a group.');
    }
    ownerUserId = user.id;

    const profile = await ensureProfileExists();
    const ownerEmail = profile?.email ?? user.email ?? null;
    const ownerName = profile?.displayName || ownerEmail?.split('@')[0] || 'Owner';
    const ownerEmailNormalized = ownerEmail ? normalizeInviteEmail(ownerEmail) : null;
    const invitedEmails = Array.from(new Set(input.invitedEmails.map(normalizeInviteEmail))).filter(
      (email) => email && email !== ownerEmailNormalized,
    );

    const { data: groupRow, error: groupError } = await supabase
      .from('groups')
      .insert({
        owner_id: user.id,
        name: input.name,
        type: input.type,
        currency: 'CAD',
        start_date: input.startDate,
        end_date: input.endDate ?? null,
        settlement_mode: 'individual',
        status: 'active',
      })
      .select('*')
      .single();

    if (groupError) {
      throw groupError;
    }
    const group = mapGroup(groupRow);
    createdGroupId = group.id;
    logger.info('Group insert succeeded', { table: 'groups', groupId: group.id });

    const { data: ownerMemberRow, error: ownerMemberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        email: ownerEmail,
        display_name: ownerName,
        nickname: ownerName,
        role: 'owner',
        invitation_status: 'active',
        is_active: true,
      })
      .select('*')
      .single();

    if (ownerMemberError) {
      throw ownerMemberError;
    }
    logger.info('Owner member insert succeeded', { table: 'group_members', groupId: group.id });

    const members: GroupMember[] = [mapGroupMember(ownerMemberRow)];
    const invitations: GroupInvitation[] = [];

    for (const invitedEmail of invitedEmails) {
      logger.info('Invited member creation started', {
        table: 'group_invitations',
        groupId: group.id,
        email: maskEmail(invitedEmail),
      });
      try {
        const result = await createGroupInvitation({
          groupId: group.id,
          invitedBy: user.id,
          invitedEmail,
          message: input.message,
        });
        members.push(result.member);
        invitations.push(result.invitation);
        logger.info('Invited member creation succeeded', {
          table: 'group_invitations',
          groupId: group.id,
          invitationId: result.invitation.id,
          email: maskEmail(invitedEmail),
        });
        await sendInvitationEmail(result.invitation.id);
      } catch (error) {
        logger.warn(
          'Invited member creation failed; rolling back created group',
          {
            table: 'group_invitations',
            groupId: group.id,
            email: maskEmail(invitedEmail),
          },
          error,
        );
        throw new Error(GROUP_INVITATION_LINK_ERROR);
      }
    }

    logger.info('Create group with invitations succeeded', {
      table: 'groups',
      groupId: group.id,
      invitationCount: invitations.length,
    });
    return {
      group: getGroupById(group.id) ?? group,
      members,
      invitations,
    };
  } catch (error) {
    if (createdGroupId && ownerUserId) {
      await cleanupCreatedGroup(createdGroupId, ownerUserId);
    }

    const handledInvitationFailure =
      error instanceof Error && error.message === GROUP_INVITATION_LINK_ERROR;
    if (handledInvitationFailure) {
      logger.warn('Create group with invitations failed after handled invitation error', {
        table: 'groups',
        name: input.name,
        invitedCount: input.invitedEmails.length,
      });
    } else {
      logger.error('Create group with invitations failed', error, {
        table: 'groups',
        name: input.name,
        invitedCount: input.invitedEmails.length,
      });
    }
    throw error;
  }
}

async function cleanupCreatedGroup(groupId: string, ownerId: string): Promise<void> {
  logger.info('Cleaning up partially created group', { table: 'groups', groupId });
  const { error } = await supabase.from('groups').delete().eq('id', groupId).eq('owner_id', ownerId);
  if (error) {
    logger.error('Partially created group cleanup failed', error, { table: 'groups', groupId });
    return;
  }
  logger.info('Partially created group cleanup succeeded', { table: 'groups', groupId });
}

export async function updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group> {
  logger.info('Update group started', { table: 'groups', groupId });
  try {
    const { error } = await supabase
      .from('groups')
      .update({
        name: input.name,
        type: input.type,
        start_date: input.startDate,
        end_date: input.endDate,
        settlement_mode: input.settlementMode,
        status: input.status,
      })
      .eq('id', groupId);
    if (error) {
      throw error;
    }
    logger.info('Update group succeeded', { table: 'groups', groupId });
    return getGroupOrThrow(groupId);
  } catch (error) {
    logger.error('Update group failed', error, { table: 'groups', groupId });
    throw error;
  }
}

export async function updateGroupDetails(groupId: string, input: UpdateGroupInput): Promise<Group> {
  const userId = getCurrentUserId();
  const group = getGroupOrThrow(groupId);
  if (group.ownerId !== userId) {
    throw new Error('Only the group owner can edit group details.');
  }
  return updateGroup(groupId, input);
}

export async function setGroupInactive(groupId: string): Promise<Group> {
  logger.info('Set group inactive started', { table: 'groups', groupId });
  try {
    const userId = getCurrentUserId();
    const group = getGroupOrThrow(groupId);
    if (group.ownerId !== userId) {
      throw new Error('Only the group owner can set a group inactive.');
    }

    const { data, error } = await supabase
      .from('groups')
      .update({
        status: 'inactive',
        inactive_at: new Date().toISOString(),
      })
      .eq('id', groupId)
      .select(GROUP_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    logger.info('Set group inactive succeeded', { table: 'groups', groupId });
    return mapGroup(data);
  } catch (error) {
    logger.error('Set group inactive failed', error, { table: 'groups', groupId });
    throw error;
  }
}

export async function reactivateGroup(groupId: string): Promise<Group> {
  logger.info('Reactivate group started', { table: 'groups', groupId });
  try {
    const userId = getCurrentUserId();
    const group = getGroupOrThrow(groupId);
    if (group.ownerId !== userId) {
      throw new Error('Only the group owner can reactivate a group.');
    }
    if (!isGroupInactive(group)) {
      throw new Error('This group is already active.');
    }

    const { data, error } = await supabase
      .from('groups')
      .update({
        status: 'active',
        inactive_at: null,
      })
      .eq('id', groupId)
      .select(GROUP_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    logger.info('Reactivate group succeeded', { table: 'groups', groupId });
    return mapGroup(data);
  } catch (error) {
    logger.error('Reactivate group failed', error, { table: 'groups', groupId });
    throw error;
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  logger.info('Delete group started', { groupId });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const userId = userData.user?.id;
    if (!userId) {
      throw new Error('You must be logged in to delete a group.');
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', groupId)
      .maybeSingle();
    if (groupError) {
      throw groupError;
    }
    if (!group) {
      throw new Error('Group not found.');
    }
    if (group.owner_id !== userId) {
      throw new Error('Only the group owner can delete a group.');
    }

    const { error } = await supabase.from('groups').delete().eq('id', groupId).eq('owner_id', userId);
    if (error) {
      throw error;
    }
    logger.info('Delete group succeeded', { groupId });
  } catch (error) {
    logger.error('Delete group failed', error, { groupId });
    throw error;
  }
}

function getGroupOrThrow(groupId: string): Group {
  const group = getGroupById(groupId);
  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }
  return group;
}

function mapGroupCard(
  group: Group,
  index: number,
  userId: string,
  db: ReturnType<typeof readDb>,
): GroupCardView {
  const member = findMemberForUser(group.id, userId, db);
  const balanceSummary = member
    ? getCurrentUserGroupBalanceSummary(group.id, userId)
    : {
        adjustedBalanceCents: 0,
        status: 'settled' as const,
        label: 'Settled',
      };
  const totalSpentCents = getGroupExpenses(group.id, db).reduce(
    (sum, expense) => sum + expense.amountCents,
    0,
  );
  return {
    id: group.id,
    name: group.name,
    memberCount: getGroupMembers(group.id, db).length,
    totalSpentCents,
    statusLabel: group.status === 'inactive' ? 'Inactive' : group.status === 'ready_to_settle' ? 'Not Settled' : 'Active',
    balanceLabel: balanceSummary.label,
    balancePositive: balanceSummary.status === 'owed',
    balanceStatus: balanceSummary.status,
    imageKey: index % 2 === 0 ? 'mountains' : 'bridge',
  };
}

export function buildGroupCards(userId: string = getCurrentUserId()): GroupCardView[] {
  const db = readDb();
  return getAccessibleGroupsForUser(userId, db)
    .filter((group) => isActiveGroupStatus(group.status))
    .map((group, index) => mapGroupCard(group, index, userId, db));
}

export function buildInactiveGroupCards(userId: string = getCurrentUserId()): GroupCardView[] {
  const db = readDb();
  return getAccessibleGroupsForUser(userId, db)
    .filter((group) => group.status === 'inactive')
    .map((group, index) => mapGroupCard(group, index, userId, db));
}

export async function fetchAccessibleGroups(): Promise<Group[]> {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  logger.info('Fetch accessible groups started', { table: 'groups', userId });
  try {
    const groups = await fetchGroupsForCurrentUser(userId);
    logger.info('Fetch accessible groups succeeded', { table: 'groups', count: groups.length, userId });
    return groups;
  } catch (error) {
    logger.error('Fetch accessible groups failed', error, { table: 'groups', userId });
    throw error;
  }
}

export async function fetchAccessibleGroupOptions(
  userId: string = getCurrentUserId(),
): Promise<GroupSelectorOption[]> {
  logger.info('Fetch accessible group options started', { table: 'groups' });
  try {
    const groups = await fetchAccessibleGroups();
    const activeGroups = groups.filter((group) => isActiveGroupStatus(group.status));
    if (activeGroups.length === 0) {
      logger.info('Fetch accessible group options succeeded', { count: 0, table: 'groups' });
      return [];
    }

    const groupIds = activeGroups.map((group) => group.id);
    const { data: memberRows, error: membersError } = await supabase
      .from('group_members')
      .select('group_id, role, invitation_status, is_active')
      .in('group_id', groupIds);

    if (membersError) {
      throw membersError;
    }

    const members = memberRows ?? [];
    const options = activeGroups.map((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      memberCount: members.filter(
        (member) =>
          member.group_id === group.id &&
          (member.role === 'owner' || (member.invitation_status === 'active' && member.is_active !== false)),
      ).length,
    }));

    logger.info('Fetch accessible group options succeeded', { count: options.length, table: 'groups' });
    return options;
  } catch (error) {
    logger.error('Fetch accessible group options failed', error, { table: 'groups' });
    throw error;
  }
}

export function getAccessibleGroupOptions(userId: string = getCurrentUserId()): GroupSelectorOption[] {
  const db = readDb();
  return getAccessibleGroupsForUser(userId, db)
    .filter((group) => isActiveGroupStatus(group.status))
    .map((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      memberCount: getGroupMembers(group.id, db).filter(
        (m) => m.role === 'owner' || (m.invitationStatus === 'active' && m.isActive !== false),
      ).length,
    }));
}

/** Active groups only — for Add Expense / Split Bill selectors. */
export function getExpenseSelectableGroupOptions(userId: string = getCurrentUserId()): GroupSelectorOption[] {
  return getAccessibleGroupOptions(userId);
}

export function getPrimaryGroupIdForUser(userId: string = getCurrentUserId()): string | undefined {
  const groups = getAccessibleGroupsForUser(userId).filter((group) => isActiveGroupStatus(group.status));
  return groups[0]?.id;
}

export function getGroupsSummary(userId: string = getCurrentUserId()): GroupsSummaryView {
  const cards = buildGroupCards(userId);
  let youOwedCents = 0;
  let youOweCents = 0;
  for (const group of getAccessibleGroupsForUser(userId)) {
    if (!isActiveGroupStatus(group.status)) {
      continue;
    }
    const balanceSummary = getCurrentUserGroupBalanceSummary(group.id, userId);
    const balance = balanceSummary.adjustedBalanceCents;
    if (balance > 0) {
      youOwedCents += balance;
    } else if (balance < 0) {
      youOweCents += Math.abs(balance);
    }
  }
  return {
    monthLabel: `${formatMonthYear()} Groups`,
    activeGroupCount: cards.length,
    youOwedCents,
    youOweCents,
  };
}
