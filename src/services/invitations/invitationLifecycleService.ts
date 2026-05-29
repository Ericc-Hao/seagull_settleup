import { mapGroupInvitation } from '../../lib/mappers';
import type { GroupInvitationRow } from '../../types/database';
import type { CreateGroupInvitationInput } from '../../types/inputs';
import type { GroupInvitation, GroupMember } from '../../types/models';
import type { PendingInvitationView } from '../../types/views';
import { createLogger } from '../../utils/logger';
import { isValidEmail, maskEmail, normalizeEmail } from '../../utils/validation';
import {
  classifyInviteDuplicate,
  duplicateInviteWarning,
} from '../invitationDuplicateRules';
import {
  ensureInvitationNotification,
  markInvitationNotificationsAsRead,
} from '../notificationService';
import { findProfileByEmail } from '../profileService';
import { sendInvitationEmail } from './invitationEmailService';
import {
  activateGroupMemberOnAccept,
  assertGroupOwner,
  fetchGroupsAndProfilesForEnrichment,
  fetchGroupName,
  fetchGroupNameAndType,
  fetchInvitationByGroupMemberId,
  fetchInvitationRowById,
  fetchInvitationRowByToken,
  fetchInvitationRowForAccept,
  fetchInvitationRowForCancel,
  fetchInvitationRowForResend,
  fetchPendingInvitationRowsForUser,
  findReusableMemberRow,
  getAuthenticatedUserId,
  getCurrentAuthUser,
  getGroupEmailOccupancy,
  getGroupSummary,
  getProfileById,
  insertGroupInvitation,
  insertPendingMemberForInvite,
  linkGroupMemberToUser,
  linkInvitationToUser,
  loadNotificationFallbacksByInvitationId,
  markInvitationAccepted,
  markInvitationCancelled,
  markInvitationDeclined,
  markMemberCancelled,
  markMemberDeclined,
  updateReusableMemberForInvite,
} from './invitationRepository';
import type {
  AcceptInvitationResult,
  InvitationDetailFallback,
  InvitationEmailResult,
  InviteMembersResult,
} from './invitationTypes';
import { INVITATION_LINK_GENERATION_ERROR as LINK_GENERATION_ERROR } from './invitationTypes';

const logger = createLogger('invitationLifecycleService');

function emailPrefix(email: string): string {
  return email.split('@')[0] || email;
}

export function invitationFallbackFromNotification(notification: {
  data: InvitationDetailFallback & { invitationId?: string };
  createdAt: string;
}): InvitationDetailFallback {
  return {
    groupId: notification.data.groupId,
    groupName: notification.data.groupName,
    inviterName: notification.data.inviterName,
    inviterEmail: notification.data.inviterEmail,
    invitedEmail: notification.data.invitedEmail,
    invitedBy: notification.data.invitedBy,
    createdAt: notification.data.createdAt ?? notification.createdAt,
  };
}

function mergeInvitationView(
  row: GroupInvitationRow,
  fallback: InvitationDetailFallback | undefined,
  groupFromDb?: { name?: string; type?: string } | null,
): PendingInvitationView {
  const invitation = mapGroupInvitation(row);
  const groupNameFromDb = groupFromDb?.name?.trim();
  const groupNameFromFallback = fallback?.groupName?.trim();
  let groupName = groupNameFromFallback || groupNameFromDb;

  if (!groupName) {
    logger.warn('Invitation modal missing group name', { invitationId: row.id, groupId: row.group_id });
    groupName = 'this group';
  }

  const inviterName = fallback?.inviterName?.trim() || undefined;
  const inviterEmail = fallback?.inviterEmail?.trim() || undefined;

  if (!inviterName && !inviterEmail) {
    logger.warn('Invitation modal missing inviter info', { invitationId: row.id });
  }

  return {
    id: invitation.id,
    groupId: invitation.groupId,
    groupName,
    groupType: groupFromDb?.type as PendingInvitationView['groupType'],
    invitedEmail: invitation.invitedEmail || fallback?.invitedEmail || '',
    invitedBy: invitation.invitedBy,
    inviterName,
    inviterEmail,
    createdAt: invitation.createdAt || fallback?.createdAt || new Date().toISOString(),
    status: invitation.status,
  };
}

async function ensureNotificationForInvitationRow(
  row: GroupInvitationRow,
  userId: string,
): Promise<void> {
  const group = await getGroupSummary(row.group_id);
  const inviter = await getProfileById(row.invited_by);
  await ensureInvitationNotification({
    invitationId: row.id,
    userId,
    groupId: row.group_id,
    groupName: group?.name ?? 'this group',
    invitedBy: row.invited_by,
    inviterName: inviter?.displayName,
    inviterEmail: inviter?.email,
    invitedEmail: row.invited_email,
    createdAt: row.created_at,
  });
}

async function enrichPendingInvitations(
  rows: GroupInvitationRow[],
  fallbackByInvitationId?: Map<string, InvitationDetailFallback>,
  userId?: string,
): Promise<PendingInvitationView[]> {
  if (rows.length === 0) {
    return [];
  }

  const fallbacks =
    fallbackByInvitationId ??
    (userId ? await loadNotificationFallbacksByInvitationId(userId) : new Map<string, InvitationDetailFallback>());
  const groupIds = Array.from(new Set(rows.map((row) => row.group_id)));
  const inviterIds = Array.from(new Set(rows.map((row) => row.invited_by)));

  const { groups, profiles } = await fetchGroupsAndProfilesForEnrichment(groupIds, inviterIds);

  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const fallback = fallbacks.get(row.id);
    const profile = profileMap.get(row.invited_by);
    const mergedFallback: InvitationDetailFallback = {
      ...fallback,
      inviterName: fallback?.inviterName ?? profile?.display_name ?? undefined,
      inviterEmail: fallback?.inviterEmail ?? profile?.email ?? undefined,
      invitedEmail: fallback?.invitedEmail ?? row.invited_email,
    };
    const groupRow = groupMap.get(row.group_id);
    const groupFromDb = groupRow
      ? { name: groupRow.name, type: groupRow.type ?? undefined }
      : undefined;
    return mergeInvitationView(row, mergedFallback, groupFromDb);
  });
}

export async function getInvitationDetail(
  invitationId: string,
  fallback?: InvitationDetailFallback,
): Promise<PendingInvitationView | null> {
  logger.info('Opening invitation modal', { invitationId, groupId: fallback?.groupId });
  try {
    const row = await fetchInvitationRowById(invitationId);

    if (!row) {
      if (!fallback?.groupName && !fallback?.inviterEmail && !fallback?.inviterName) {
        return null;
      }
      return {
        id: invitationId,
        groupId: fallback?.groupId ?? '',
        groupName: fallback?.groupName?.trim() || 'this group',
        invitedEmail: fallback?.invitedEmail ?? '',
        invitedBy: fallback?.invitedBy ?? '',
        inviterName: fallback?.inviterName,
        inviterEmail: fallback?.inviterEmail,
        createdAt: fallback?.createdAt ?? new Date().toISOString(),
        status: 'cancelled',
      };
    }

    const group = await fetchGroupNameAndType(row.group_id);

    const fallbackMap = fallback ? new Map([[invitationId, fallback]]) : undefined;
    const [view] = await enrichPendingInvitations([row], fallbackMap, row.invited_user_id ?? undefined);
    if (group?.name && view.groupName === 'this group') {
      view.groupName = group.name;
    }
    logger.info('Get invitation detail succeeded', { invitationId, status: view.status, table: 'group_invitations' });
    return view;
  } catch (error) {
    logger.error('Failed to load invitation detail', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}

/** @deprecated Use getInvitationDetail */
export async function getInvitationViewById(invitationId: string): Promise<PendingInvitationView | null> {
  return getInvitationDetail(invitationId);
}

async function upsertPendingMemberForInvite(
  groupId: string,
  invitedEmail: string,
): Promise<GroupMember> {
  const invitedProfile = await findProfileByEmail(invitedEmail);
  const displayName = invitedProfile?.displayName || emailPrefix(invitedEmail);
  const reusableMember = await findReusableMemberRow(groupId, invitedEmail);

  if (reusableMember) {
    return updateReusableMemberForInvite(reusableMember.id, {
      userId: invitedProfile?.id ?? null,
      displayName,
    });
  }

  return insertPendingMemberForInvite({
    groupId,
    userId: invitedProfile?.id ?? null,
    email: invitedEmail,
    displayName,
  });
}

export async function createGroupInvitation(
  input: CreateGroupInvitationInput,
): Promise<{ member: GroupMember; invitation: GroupInvitation }> {
  const invitedEmail = normalizeEmail(input.invitedEmail);
  logger.info('Create invitation started', {
    table: 'group_invitations',
    groupId: input.groupId,
    email: maskEmail(invitedEmail),
  });

  try {
    const invitedProfile = await findProfileByEmail(invitedEmail);
    const member = await upsertPendingMemberForInvite(input.groupId, invitedEmail);
    const invitedUserId = invitedProfile?.id ?? member.userId ?? null;

    const invitation = await insertGroupInvitation(input, invitedEmail, member, invitedUserId);

    if (!invitation.token) {
      logger.warn('Create invitation returned without token', {
        table: 'group_invitations',
        groupId: input.groupId,
        invitationId: invitation.id,
        email: maskEmail(invitedEmail),
      });
      throw new Error(LINK_GENERATION_ERROR);
    }
    logger.info('Create invitation succeeded', {
      table: 'group_invitations',
      groupId: input.groupId,
      invitationId: invitation.id,
      email: maskEmail(invitedEmail),
      inviteeHasAccount: Boolean(invitedUserId),
    });
    return { member, invitation };
  } catch (error) {
    const handledLinkGenerationError =
      error instanceof Error && error.message === LINK_GENERATION_ERROR;
    if (handledLinkGenerationError) {
      logger.warn(
        'Create invitation failed because token was not returned',
        {
          table: 'group_invitations',
          groupId: input.groupId,
          email: maskEmail(invitedEmail),
        },
        error,
      );
    } else {
      logger.error('Create invitation failed', error, {
        table: 'group_invitations',
        groupId: input.groupId,
        email: maskEmail(invitedEmail),
      });
    }
    throw error;
  }
}

export async function createGroupInvitations(
  groupId: string,
  emails: string[],
  message?: string,
): Promise<InviteMembersResult> {
  const userId = await getAuthenticatedUserId();
  await assertGroupOwner(groupId, userId);
  return inviteMoreMembers(groupId, emails, message);
}

export async function inviteMoreMembers(
  groupId: string,
  emails: string[],
  message?: string,
): Promise<InviteMembersResult> {
  logger.info('Invite more members started', { groupId, emailCount: emails.length, table: 'group_invitations' });
  try {
    const userId = await getAuthenticatedUserId();
    await assertGroupOwner(groupId, userId);

    const normalizedEmails = Array.from(new Set(emails.map(normalizeEmail))).filter(Boolean);
    for (const email of normalizedEmails) {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid email: ${maskEmail(email)}`);
      }
    }

    const occupancy = await getGroupEmailOccupancy(groupId);
    const members: GroupMember[] = [];
    const invitations: GroupInvitation[] = [];
    const emailResults: InvitationEmailResult[] = [];
    const warnings: string[] = [];

    for (const email of normalizedEmails) {
      const duplicateReason = classifyInviteDuplicate(email, occupancy);
      if (duplicateReason) {
        warnings.push(duplicateInviteWarning(duplicateReason));
        continue;
      }

      const { member, invitation } = await createGroupInvitation({
        groupId,
        invitedBy: userId,
        invitedEmail: email,
        message,
      });
      members.push(member);
      invitations.push(invitation);
      occupancy.activeMemberEmails.delete(normalizeEmail(email));
      occupancy.pendingInvitationEmails.add(normalizeEmail(email));

      const emailResult = await sendInvitationEmail(invitation.id);
      emailResults.push(emailResult);
      if (!emailResult.sent) {
        warnings.push(
          `Invitation for ${maskEmail(email)} was created, but email could not be sent. You can resend it later.`,
        );
      }
    }

    logger.info('Invite more members succeeded', {
      groupId,
      invitationCount: invitations.length,
      table: 'group_invitations',
    });
    return { members, invitations, emailResults, warnings };
  } catch (error) {
    logger.error('Invite more members failed', error, { groupId, table: 'group_invitations' });
    throw error;
  }
}

export async function resendInvitation(invitationId: string): Promise<InvitationEmailResult> {
  logger.info('Resend invitation started', { invitationId, table: 'group_invitations' });
  try {
    const userId = await getAuthenticatedUserId();
    const invitation = await fetchInvitationRowForResend(invitationId);

    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be resent.');
    }

    await assertGroupOwner(invitation.group_id, userId);

    const result = await sendInvitationEmail(invitationId);
    logger.info('Resend invitation succeeded', { invitationId, sent: result.sent, table: 'group_invitations' });
    return result;
  } catch (error) {
    logger.error('Resend invitation failed', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}

export async function syncPendingInvitationsForCurrentUser(): Promise<PendingInvitationView[]> {
  logger.info('Sync pending invitations started', { table: 'group_invitations' });
  try {
    const user = await getCurrentAuthUser();
    if (!user) {
      logger.info('Sync pending invitations succeeded', { count: 0, table: 'group_invitations' });
      return [];
    }

    const normalizedEmail = normalizeEmail(user.email);
    const rows = await fetchPendingInvitationRowsForUser(user.id, normalizedEmail);

    let linked = false;

    for (const row of rows) {
      if (!row.invited_user_id) {
        await linkInvitationToUser(row.id, user.id);

        if (row.group_member_id) {
          await linkGroupMemberToUser(row.group_member_id, user.id);
        }
        row.invited_user_id = user.id;
        linked = true;
      }
      await ensureNotificationForInvitationRow(row, user.id);
    }

    if (linked) {
    }

    const views = await enrichPendingInvitations(rows, undefined, user.id);
    logger.info('Sync pending invitations succeeded', { count: views.length, table: 'group_invitations' });
    return views;
  } catch (error) {
    logger.error('Sync pending invitations failed', error, { table: 'group_invitations' });
    throw error;
  }
}

export async function getPendingInvitationsForCurrentUser(): Promise<PendingInvitationView[]> {
  return syncPendingInvitationsForCurrentUser();
}

export async function getPendingInvitationByToken(token: string): Promise<PendingInvitationView | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return null;
  }

  logger.info('Pending invitation by token started', { table: 'group_invitations' });
  try {
    await syncPendingInvitationsForCurrentUser();

    const row = await fetchInvitationRowByToken(trimmedToken);

    if (!row) {
      logger.info('Pending invitation by token not found', { table: 'group_invitations' });
      return null;
    }

    const views = await enrichPendingInvitations([row], undefined, row.invited_user_id ?? undefined);
    const invitation = views[0] ?? null;
    logger.info('Pending invitation by token succeeded', {
      invitationId: invitation?.id,
      table: 'group_invitations',
      status: invitation?.status,
    });
    return invitation;
  } catch (error) {
    logger.error('Pending invitation by token failed', error, { table: 'group_invitations' });
    throw error;
  }
}

export async function acceptInvitation(invitationId: string): Promise<AcceptInvitationResult> {
  logger.info('Accept invitation started', { invitationId, table: 'group_invitations' });
  try {
    const user = await getCurrentAuthUser();
    if (!user) {
      throw new Error('You must be logged in to accept an invitation.');
    }

    const invitation = await fetchInvitationRowForAccept(invitationId);
    if (invitation.status !== 'pending') {
      throw new Error('This invitation is no longer pending.');
    }

    const normalizedEmail = normalizeEmail(user.email);
    const invitedEmail = normalizeEmail(invitation.invited_email);
    const canAccept =
      invitation.invited_user_id === user.id || invitedEmail === normalizedEmail;
    if (!canAccept) {
      throw new Error('You are not authorized to accept this invitation.');
    }

    const groupId = invitation.group_id;
    if (!groupId) {
      throw new Error('Invitation is missing a group.');
    }

    if (invitation.group_member_id) {
      await activateGroupMemberOnAccept(
        invitation.group_member_id,
        user.id,
        user.email ?? invitation.invited_email,
      );
    }

    await markInvitationAccepted(invitationId, user.id);

    await markInvitationNotificationsAsRead(invitationId);

    const groupName = await fetchGroupName(groupId);

    const result: AcceptInvitationResult = {
      invitationId,
      groupId,
      groupName,
      groupMemberId: invitation.group_member_id ?? undefined,
    };

    logger.info('Invitation accepted', { invitationId, groupId, table: 'group_invitations' });
    return result;
  } catch (error) {
    logger.error('Accept invitation failed', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}

export async function declineInvitation(invitationId: string): Promise<void> {
  logger.info('Decline invitation started', { invitationId, table: 'group_invitations' });
  try {
    const invitation = await markInvitationDeclined(invitationId);

    if (invitation.group_member_id) {
      await markMemberDeclined(invitation.group_member_id);
    }

    await markInvitationNotificationsAsRead(invitationId);

    logger.info('Decline invitation succeeded', { invitationId, table: 'group_invitations' });
  } catch (error) {
    logger.error('Decline invitation failed', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}

export async function getInvitationByGroupMemberId(groupMemberId: string): Promise<GroupInvitation | null> {
  logger.debug('Get invitation by group member started', { groupMemberId, table: 'group_invitations' });
  try {
    const invitation = await fetchInvitationByGroupMemberId(groupMemberId);
    return invitation;
  } catch (error) {
    logger.error('Get invitation by group member failed', error, { groupMemberId, table: 'group_invitations' });
    throw error;
  }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  logger.info('Cancel invitation started', { invitationId, table: 'group_invitations' });
  try {
    const userId = await getAuthenticatedUserId();
    const invitation = await fetchInvitationRowForCancel(invitationId);

    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be cancelled.');
    }

    await assertGroupOwner(invitation.group_id, userId);

    await markInvitationCancelled(invitationId);

    if (invitation.group_member_id) {
      await markMemberCancelled(invitation.group_member_id);
    }

    logger.info('Cancel invitation succeeded', { invitationId, table: 'group_invitations' });
  } catch (error) {
    logger.error('Cancel invitation failed', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}

export async function hasDuplicateInviteEmailInGroup(groupId: string, emails: string[]): Promise<boolean> {
  if (emails.length === 0) {
    return false;
  }
  const occupancy = await getGroupEmailOccupancy(groupId);
  return emails.some((email) => classifyInviteDuplicate(email, occupancy) !== null);
}

export type { AcceptInvitationResult, InvitationDetailFallback, InvitationEmailResult, InviteMembersResult };
