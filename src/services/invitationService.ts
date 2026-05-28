import { mapGroupInvitation, mapGroupMember } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import type { GroupInvitationRow } from '../types/database';
import type { CreateGroupInvitationInput } from '../types/inputs';
import type { GroupInvitation, GroupMember } from '../types/models';
import type { InvitationPreviewView, PendingInvitationView } from '../types/views';
import {
  GROUP_INVITATION_COLUMNS,
  NOTIFICATION_LIST_LIMIT,
  PENDING_INVITATION_SYNC_LIMIT,
} from '../lib/queryColumns';
import { formatInvitationNotificationBody } from '../utils/invitationCopy';
import { createLogger } from '../utils/logger';
import { isValidEmail, maskEmail, normalizeEmail } from '../utils/validation';
import {
  buildGroupEmailOccupancy,
  classifyInviteDuplicate,
  duplicateInviteWarning,
  REUSABLE_MEMBER_STATUSES,
} from './invitationDuplicateRules';
import {
  ensureInvitationNotification,
  markInvitationNotificationsAsRead,
} from './notificationService';
import { findProfileByEmail } from './profileService';

const logger = createLogger('invitationService');
const INVITATION_LINK_GENERATION_ERROR = 'Invitation link could not be generated. Please try again.';

export interface InvitationEmailResult {
  invitationId: string;
  sent: boolean;
  error?: string;
}

export interface InviteMembersResult {
  members: GroupMember[];
  invitations: GroupInvitation[];
  emailResults: InvitationEmailResult[];
  warnings: string[];
}

export interface AcceptInvitationResult {
  invitationId: string;
  groupId: string;
  groupName?: string;
  groupMemberId?: string;
}

function emailPrefix(email: string): string {
  return email.split('@')[0] || email;
}

async function getProfileById(userId: string): Promise<{ displayName?: string; email?: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return { displayName: data.display_name, email: data.email ?? undefined };
}

async function getGroupSummary(groupId: string): Promise<{ name: string; type?: string } | null> {
  const { data, error } = await supabase.from('groups').select('name, type').eq('id', groupId).maybeSingle();
  if (error) {
    throw error;
  }
  return data ? { name: data.name, type: data.type ?? undefined } : null;
}

export { formatInvitationMessage } from '../utils/invitationCopy';

export interface InvitationDetailFallback {
  groupId?: string;
  groupName?: string;
  inviterName?: string;
  inviterEmail?: string;
  invitedEmail?: string;
  invitedBy?: string;
  createdAt?: string;
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

async function loadNotificationFallbacksByInvitationId(userId: string): Promise<Map<string, InvitationDetailFallback>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('data, created_at')
    .eq('user_id', userId)
    .eq('type', 'group_invitation')
    .is('cleared_at', null)
    .limit(NOTIFICATION_LIST_LIMIT);

  if (error) {
    logger.warn('Load notification fallbacks failed', { table: 'notifications' });
    return new Map();
  }

  const map = new Map<string, InvitationDetailFallback>();
  for (const row of data ?? []) {
    const payload = row.data as Record<string, string | undefined> | null;
    const invitationId = payload?.invitationId;
    if (!invitationId) {
      continue;
    }
    map.set(invitationId, {
      groupId: payload.groupId,
      groupName: payload.groupName,
      inviterName: payload.inviterName,
      inviterEmail: payload.inviterEmail,
      invitedEmail: payload.invitedEmail,
      invitedBy: payload.invitedBy,
      createdAt: payload.createdAt ?? row.created_at,
    });
  }
  return map;
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

  const [{ data: groups, error: groupsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from('groups').select('id, name, type').in('id', groupIds),
    supabase.from('profiles').select('id, display_name, email').in('id', inviterIds),
  ]);

  if (groupsError) {
    throw groupsError;
  }
  if (profilesError) {
    throw profilesError;
  }

  const groupMap = new Map((groups ?? []).map((group) => [group.id, group]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const fallback = fallbacks.get(row.id);
    const profile = profileMap.get(row.invited_by);
    const mergedFallback: InvitationDetailFallback = {
      ...fallback,
      inviterName: fallback?.inviterName ?? profile?.display_name ?? undefined,
      inviterEmail: fallback?.inviterEmail ?? profile?.email ?? undefined,
      invitedEmail: fallback?.invitedEmail ?? row.invited_email,
    };
    return mergeInvitationView(row, mergedFallback, groupMap.get(row.group_id));
  });
}

export async function getInvitationDetail(
  invitationId: string,
  fallback?: InvitationDetailFallback,
): Promise<PendingInvitationView | null> {
  logger.info('Opening invitation modal', { invitationId, groupId: fallback?.groupId });
  try {
    const { data: row, error } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (error) {
      throw error;
    }

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

    const { data: group } = await supabase
      .from('groups')
      .select('name, type')
      .eq('id', row.group_id)
      .maybeSingle();

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

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('You must be logged in.');
  }
  return data.user.id;
}

async function assertGroupOwner(groupId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.from('groups').select('owner_id').eq('id', groupId).single();
  if (error) {
    throw error;
  }
  if (data.owner_id !== userId) {
    throw new Error('Only the group owner can manage invitations.');
  }
}

async function getGroupEmailOccupancy(groupId: string): Promise<{
  activeMemberEmails: Set<string>;
  pendingInvitationEmails: Set<string>;
}> {
  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] =
    await Promise.all([
      supabase
        .from('group_members')
        .select('email, invitation_status, is_active, role')
        .eq('group_id', groupId),
      supabase
        .from('group_invitations')
        .select('invited_email')
        .eq('group_id', groupId)
        .eq('status', 'pending'),
    ]);

  if (membersError) {
    throw membersError;
  }
  if (invitationsError) {
    throw invitationsError;
  }

  return buildGroupEmailOccupancy(
    members ?? [],
    (invitations ?? []).map((row) => row.invited_email).filter(Boolean) as string[],
  );
}

export async function hasDuplicateInviteEmailInGroup(groupId: string, emails: string[]): Promise<boolean> {
  if (emails.length === 0) {
    return false;
  }
  const occupancy = await getGroupEmailOccupancy(groupId);
  return emails.some((email) => classifyInviteDuplicate(email, occupancy) !== null);
}

async function findReusableMemberRow(groupId: string, invitedEmail: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('email', invitedEmail)
    .in('invitation_status', [...REUSABLE_MEMBER_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

async function upsertPendingMemberForInvite(
  groupId: string,
  invitedEmail: string,
): Promise<GroupMember> {
  const invitedProfile = await findProfileByEmail(invitedEmail);
  const displayName = invitedProfile?.displayName || emailPrefix(invitedEmail);
  const reusableMember = await findReusableMemberRow(groupId, invitedEmail);

  if (reusableMember) {
    const { data: memberRow, error: memberError } = await supabase
      .from('group_members')
      .update({
        user_id: invitedProfile?.id ?? null,
        display_name: displayName,
        nickname: displayName,
        role: 'member',
        invitation_status: 'pending',
        is_active: false,
      })
      .eq('id', reusableMember.id)
      .select('*')
      .single();

    if (memberError) {
      throw memberError;
    }
    return mapGroupMember(memberRow);
  }

  const { data: memberRow, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: invitedProfile?.id ?? null,
      email: invitedEmail,
      display_name: displayName,
      nickname: displayName,
      role: 'member',
      invitation_status: 'pending',
      is_active: false,
    })
    .select('*')
    .single();

  if (memberError) {
    throw memberError;
  }
  return mapGroupMember(memberRow);
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

    const { data: invitationRow, error: invitationError } = await supabase
      .from('group_invitations')
      .insert({
        group_id: input.groupId,
        invited_by: input.invitedBy,
        invited_email: invitedEmail,
        invited_user_id: invitedUserId,
        group_member_id: member.id,
        status: 'pending',
        message: input.message?.trim() || null,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select(GROUP_INVITATION_COLUMNS)
      .single();

    if (invitationError) {
      throw invitationError;
    }

    const invitation = mapGroupInvitation(invitationRow);
    if (!invitation.token) {
      logger.warn('Create invitation returned without token', {
        table: 'group_invitations',
        groupId: input.groupId,
        invitationId: invitation.id,
        email: maskEmail(invitedEmail),
      });
      throw new Error(INVITATION_LINK_GENERATION_ERROR);
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
      error instanceof Error && error.message === INVITATION_LINK_GENERATION_ERROR;
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

export async function sendInvitationEmail(invitationId: string): Promise<InvitationEmailResult> {
  logger.info('Send invitation email started', { invitationId, table: 'group_invitations' });
  try {
    const { data, error } = await supabase.functions.invoke('send-group-invitation', {
      body: { invitationId },
    });

    if (error) {
      logger.error('Send invitation email failed', error, { invitationId, table: 'group_invitations' });
      return { invitationId, sent: false, error: error.message };
    }

    const payload = data as {
      success?: boolean;
      emailSent?: boolean;
      sent?: boolean;
      error?: string;
      reason?: string;
    } | null;
    const emailWasSent = payload?.emailSent === true || payload?.sent === true;
    if (emailWasSent) {
      logger.info('Send invitation email succeeded', { invitationId, table: 'group_invitations' });
      return { invitationId, sent: true };
    }

    const emailError = payload?.error ?? payload?.reason ?? 'Email could not be sent.';
    logger.warn('Send invitation email returned failure', { invitationId, table: 'group_invitations' });
    return {
      invitationId,
      sent: false,
      error: emailError,
    };
  } catch (error) {
    logger.error('Send invitation email failed', error, { invitationId, table: 'group_invitations' });
    return {
      invitationId,
      sent: false,
      error: error instanceof Error ? error.message : 'Email could not be sent.',
    };
  }
}

/** @deprecated Use sendInvitationEmail */
export async function sendGroupInvitationEmail(invitationId: string, _groupId: string): Promise<void> {
  await sendInvitationEmail(invitationId);
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
    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .select('group_id, status, invited_by')
      .eq('id', invitationId)
      .single();

    if (error) {
      throw error;
    }
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
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const user = userData.user;
    if (!user?.email) {
      logger.info('Sync pending invitations succeeded', { count: 0, table: 'group_invitations' });
      return [];
    }

    const normalizedEmail = normalizeEmail(user.email);
    const { data, error } = await supabase
      .from('group_invitations')
      .select(GROUP_INVITATION_COLUMNS)
      .eq('status', 'pending')
      .or(`invited_user_id.eq.${user.id},invited_email.ilike.${normalizedEmail}`)
      .limit(PENDING_INVITATION_SYNC_LIMIT);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    let linked = false;

    for (const row of rows) {
      if (!row.invited_user_id) {
        const { error: linkInviteError } = await supabase
          .from('group_invitations')
          .update({ invited_user_id: user.id })
          .eq('id', row.id);
        if (linkInviteError) {
          throw linkInviteError;
        }

        if (row.group_member_id) {
          const { error: linkMemberError } = await supabase
            .from('group_members')
            .update({ user_id: user.id })
            .eq('id', row.group_member_id);
          if (linkMemberError) {
            throw linkMemberError;
          }
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

export async function getInvitationPreviewByToken(token: string): Promise<InvitationPreviewView | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return null;
  }

  logger.info('Get invitation preview started', { hasToken: Boolean(trimmedToken) });

  try {
    const { data, error } = await supabase.functions.invoke('get-invitation-preview', {
      body: { token: trimmedToken },
    });

    if (error) {
      throw error;
    }

    const payload = data as {
      success?: boolean;
      error?: string;
      invitation?: {
        invitationId: string;
        token?: string;
        groupId?: string;
        groupName?: string;
        invitedEmail?: string;
        inviterName?: string;
        inviterEmail?: string;
        status?: InvitationPreviewView['status'];
        expiresAt?: string | null;
        isValid?: boolean;
        inviteeHasAccount?: boolean;
      };
      preview?: {
        invitationId: string;
        token?: string;
        groupId?: string;
        groupName?: string;
        invitedEmail?: string;
        inviterName?: string;
        inviterEmail?: string;
        status?: InvitationPreviewView['status'];
        expiresAt?: string | null;
        isValid?: boolean;
        inviteeHasAccount?: boolean;
      };
    } | null;

    if (!payload?.success) {
      if (payload?.error === 'Invitation not found') {
        logger.info('Get invitation preview succeeded', { hasInvitation: false });
        return null;
      }
      throw new Error(payload?.error ?? 'Unable to load invitation preview.');
    }

    const invitation = payload.invitation ?? payload.preview;
    if (!invitation) {
      logger.info('Get invitation preview succeeded', { hasInvitation: false });
      return null;
    }

    const preview: InvitationPreviewView = {
      invitationId: invitation.invitationId,
      token: invitation.token ?? trimmedToken,
      groupId: invitation.groupId,
      groupName: invitation.groupName?.trim() || 'this group',
      inviterName: invitation.inviterName?.trim() || undefined,
      inviterEmail: invitation.inviterEmail?.trim() || undefined,
      invitedEmail: invitation.invitedEmail?.trim() || '',
      status: invitation.status ?? 'cancelled',
      expiresAt: invitation.expiresAt ?? null,
      isValid: Boolean(invitation.isValid),
      inviteeHasAccount: Boolean(invitation.inviteeHasAccount),
    };

    logger.info('Get invitation preview succeeded', {
      hasInvitation: true,
      status: preview.status,
      invitationId: preview.invitationId,
      inviteeHasAccount: preview.inviteeHasAccount,
    });
    return preview;
  } catch (error) {
    logger.error('Get invitation preview failed', error, { table: 'group_invitations' });
    throw error;
  }
}

export async function getPendingInvitationByToken(token: string): Promise<PendingInvitationView | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return null;
  }

  logger.info('Pending invitation by token started', { table: 'group_invitations' });
  try {
    await syncPendingInvitationsForCurrentUser();

    const { data: row, error } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('token', trimmedToken)
      .maybeSingle();

    if (error) {
      throw error;
    }
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
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const user = userData.user;
    if (!user?.email) {
      throw new Error('You must be logged in to accept an invitation.');
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError) {
      throw invitationError;
    }
    if (!invitation) {
      throw new Error('Invitation not found.');
    }
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
      const { data: memberRow, error: memberError } = await supabase
        .from('group_members')
        .update({
          user_id: user.id,
          email: user.email ?? invitation.invited_email,
          invitation_status: 'active',
          is_active: true,
        })
        .eq('id', invitation.group_member_id)
        .select('id')
        .single();

      if (memberError) {
        throw memberError;
      }
      if (!memberRow) {
        throw new Error('Could not activate group membership.');
      }
    }

    const { error: updateInvitationError } = await supabase
      .from('group_invitations')
      .update({
        status: 'accepted',
        invited_user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateInvitationError) {
      throw updateInvitationError;
    }

    await markInvitationNotificationsAsRead(invitationId);

    let groupName: string | undefined;
    const { data: groupRow } = await supabase.from('groups').select('name').eq('id', groupId).maybeSingle();
    groupName = groupRow?.name ?? undefined;

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
    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError) {
      throw invitationError;
    }

    const { error: updateInvitationError } = await supabase
      .from('group_invitations')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateInvitationError) {
      throw updateInvitationError;
    }

    if (invitation.group_member_id) {
      const { error: memberError } = await supabase
        .from('group_members')
        .update({
          invitation_status: 'declined',
          is_active: false,
        })
        .eq('id', invitation.group_member_id);

      if (memberError) {
        throw memberError;
      }
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
    const { data, error } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('group_member_id', groupMemberId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data ? mapGroupInvitation(data) : null;
  } catch (error) {
    logger.error('Get invitation by group member failed', error, { groupMemberId, table: 'group_invitations' });
    throw error;
  }
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  logger.info('Cancel invitation started', { invitationId, table: 'group_invitations' });
  try {
    const userId = await getAuthenticatedUserId();
    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invitationError) {
      throw invitationError;
    }
    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be cancelled.');
    }

    await assertGroupOwner(invitation.group_id, userId);

    const { error: updateInvitationError } = await supabase
      .from('group_invitations')
      .update({
        status: 'cancelled',
      })
      .eq('id', invitationId);

    if (updateInvitationError) {
      throw updateInvitationError;
    }

    if (invitation.group_member_id) {
      const { error: memberError } = await supabase
        .from('group_members')
        .update({
          invitation_status: 'cancelled',
          is_active: false,
        })
        .eq('id', invitation.group_member_id);

      if (memberError) {
        throw memberError;
      }
    }

    logger.info('Cancel invitation succeeded', { invitationId, table: 'group_invitations' });
  } catch (error) {
    logger.error('Cancel invitation failed', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}
