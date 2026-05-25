import { mapGroupInvitation, mapGroupMember } from '../lib/mappers';
import { refreshCache } from '../lib/supabaseSnapshot';
import { supabase } from '../lib/supabase';
import type { GroupInvitationRow } from '../types/database';
import type { CreateGroupInvitationInput } from '../types/inputs';
import type { GroupInvitation, GroupMember } from '../types/models';
import type { InvitationPreviewView, PendingInvitationView } from '../types/views';
import { createLogger } from '../utils/logger';
import { formatInvitationNotificationBody } from '../utils/invitationCopy';
import { hasDuplicateEmail, isValidEmail, maskEmail, normalizeEmail } from '../utils/validation';
import {
  ensureInvitationNotification,
  markInvitationNotificationsAsRead,
} from './notificationService';
import { findProfileByEmail } from './profileService';

const logger = createLogger('invitationService');

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

async function loadNotificationFallbacksByInvitationId(): Promise<Map<string, InvitationDetailFallback>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('data, created_at')
    .eq('type', 'group_invitation')
    .is('cleared_at', null);

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
): Promise<PendingInvitationView[]> {
  if (rows.length === 0) {
    return [];
  }

  const fallbacks = fallbackByInvitationId ?? (await loadNotificationFallbacksByInvitationId());
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
    const [view] = await enrichPendingInvitations([row], fallbackMap);
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

function createInviteToken(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure random token generation is not available on this device.');
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

async function existingEmailsForGroup(groupId: string): Promise<string[]> {
  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] =
    await Promise.all([
      supabase.from('group_members').select('email').eq('group_id', groupId),
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

  const emails = [
    ...(members ?? []).map((row) => row.email),
    ...(invitations ?? []).map((row) => row.invited_email),
  ]
    .filter(Boolean)
    .map((email) => normalizeEmail(email as string));

  return Array.from(new Set(emails));
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
    const displayName = invitedProfile?.displayName || emailPrefix(invitedEmail);

    const { data: memberRow, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: input.groupId,
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
    const member = mapGroupMember(memberRow);

    const { data: invitationRow, error: invitationError } = await supabase
      .from('group_invitations')
      .insert({
        group_id: input.groupId,
        invited_by: input.invitedBy,
        invited_email: invitedEmail,
        invited_user_id: invitedProfile?.id ?? null,
        group_member_id: member.id,
        status: 'pending',
        token: createInviteToken(),
        message: input.message?.trim() || null,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single();

    if (invitationError) {
      throw invitationError;
    }

    const invitation = mapGroupInvitation(invitationRow);
    logger.info('Create invitation succeeded', {
      table: 'group_invitations',
      groupId: input.groupId,
      invitationId: invitation.id,
      email: maskEmail(invitedEmail),
    });
    return { member, invitation };
  } catch (error) {
    logger.error('Create invitation failed', error, {
      table: 'group_invitations',
      groupId: input.groupId,
      email: maskEmail(invitedEmail),
    });
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

    const existingEmails = await existingEmailsForGroup(groupId);
    const members: GroupMember[] = [];
    const invitations: GroupInvitation[] = [];
    const emailResults: InvitationEmailResult[] = [];
    const warnings: string[] = [];

    for (const email of normalizedEmails) {
      if (hasDuplicateEmail(existingEmails, email)) {
        warnings.push(`${maskEmail(email)} is already invited or a member.`);
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
      existingEmails.push(email);

      const emailResult = await sendInvitationEmail(invitation.id);
      emailResults.push(emailResult);
      if (!emailResult.sent) {
        warnings.push(
          `Invitation for ${maskEmail(email)} was created, but email could not be sent. You can resend it later.`,
        );
      }
    }

    await refreshCache();
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
    if (invitation.invited_by !== userId) {
      throw new Error('Only the group owner can resend invitations.');
    }

    const result = await sendInvitationEmail(invitationId);
    await refreshCache();
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
      .select('*')
      .eq('status', 'pending')
      .or(`invited_user_id.eq.${user.id},invited_email.ilike.${normalizedEmail}`);

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
      await refreshCache();
    }

    const views = await enrichPendingInvitations(rows);
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

  logger.info('Invitation preview by token started', { table: 'group_invitations' });
  try {
    const { data, error } = await supabase.rpc('get_invitation_preview_by_token', {
      invite_token: trimmedToken,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      logger.info('Invitation preview by token not found', { table: 'group_invitations' });
      return null;
    }

    const preview: InvitationPreviewView = {
      invitationId: row.invitation_id,
      groupName: row.group_name?.trim() || 'this group',
      inviterName: row.inviter_name?.trim() || undefined,
      inviterEmail: row.inviter_email?.trim() || undefined,
      invitedEmail: row.invited_email?.trim() || '',
      isValid: Boolean(row.is_valid),
    };

    logger.info('Invitation preview by token succeeded', {
      invitationId: preview.invitationId,
      table: 'group_invitations',
      isValid: preview.isValid,
    });
    return preview;
  } catch (error) {
    logger.error('Invitation preview by token failed', error, { table: 'group_invitations' });
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

    const views = await enrichPendingInvitations([row]);
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
    await refreshCache();

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

    await refreshCache();
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

    await refreshCache();
    logger.info('Cancel invitation succeeded', { invitationId, table: 'group_invitations' });
  } catch (error) {
    logger.error('Cancel invitation failed', error, { invitationId, table: 'group_invitations' });
    throw error;
  }
}
