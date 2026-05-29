import { mapGroupInvitation, mapGroupMember } from '../../lib/mappers';
import {
  GROUP_INVITATION_COLUMNS,
  NOTIFICATION_LIST_LIMIT,
  PENDING_INVITATION_SYNC_LIMIT,
} from '../../lib/queryColumns';
import { supabase } from '../../lib/supabase';
import type { GroupInvitationRow } from '../../types/database';
import type { CreateGroupInvitationInput } from '../../types/inputs';
import type { GroupInvitation, GroupMember } from '../../types/models';
import { createLogger } from '../../utils/logger';
import {
  buildGroupEmailOccupancy,
  REUSABLE_MEMBER_STATUSES,
} from '../invitationDuplicateRules';
import type { InvitationDetailFallback } from './invitationTypes';

const logger = createLogger('invitationRepository');

export async function getProfileById(
  userId: string,
): Promise<{ displayName?: string; email?: string } | null> {
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

export async function getGroupSummary(groupId: string): Promise<{ name: string; type?: string } | null> {
  const { data, error } = await supabase.from('groups').select('name, type').eq('id', groupId).maybeSingle();
  if (error) {
    throw error;
  }
  return data ? { name: data.name, type: data.type ?? undefined } : null;
}

export async function loadNotificationFallbacksByInvitationId(
  userId: string,
): Promise<Map<string, InvitationDetailFallback>> {
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

export async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('You must be logged in.');
  }
  return data.user.id;
}

export async function assertGroupOwner(groupId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.from('groups').select('owner_id').eq('id', groupId).single();
  if (error) {
    throw error;
  }
  if (data.owner_id !== userId) {
    throw new Error('Only the group owner can manage invitations.');
  }
}

export async function getGroupEmailOccupancy(groupId: string): Promise<{
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

export async function findReusableMemberRow(groupId: string, invitedEmail: string) {
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

export async function updateReusableMemberForInvite(
  memberId: string,
  update: {
    userId: string | null;
    displayName: string;
  },
): Promise<GroupMember> {
  const { data: memberRow, error: memberError } = await supabase
    .from('group_members')
    .update({
      user_id: update.userId,
      display_name: update.displayName,
      nickname: update.displayName,
      role: 'member',
      invitation_status: 'pending',
      is_active: false,
    })
    .eq('id', memberId)
    .select('*')
    .single();

  if (memberError) {
    throw memberError;
  }
  return mapGroupMember(memberRow);
}

export async function insertPendingMemberForInvite(input: {
  groupId: string;
  userId: string | null;
  email: string;
  displayName: string;
}): Promise<GroupMember> {
  const { data: memberRow, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: input.groupId,
      user_id: input.userId,
      email: input.email,
      display_name: input.displayName,
      nickname: input.displayName,
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

export async function insertGroupInvitation(
  input: CreateGroupInvitationInput,
  invitedEmail: string,
  member: GroupMember,
  invitedUserId: string | null,
): Promise<GroupInvitation> {
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

  return mapGroupInvitation(invitationRow);
}

export async function fetchInvitationRowById(invitationId: string): Promise<GroupInvitationRow | null> {
  const { data: row, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return row;
}

export async function fetchInvitationRowByToken(token: string): Promise<GroupInvitationRow | null> {
  const { data: row, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return row;
}

export async function fetchInvitationRowForResend(invitationId: string): Promise<{
  group_id: string;
  status: string;
  invited_by: string;
}> {
  const { data: invitation, error } = await supabase
    .from('group_invitations')
    .select('group_id, status, invited_by')
    .eq('id', invitationId)
    .single();

  if (error) {
    throw error;
  }
  return invitation;
}

export async function fetchPendingInvitationRowsForUser(
  userId: string,
  normalizedEmail: string,
): Promise<GroupInvitationRow[]> {
  const { data, error } = await supabase
    .from('group_invitations')
    .select(GROUP_INVITATION_COLUMNS)
    .eq('status', 'pending')
    .or(`invited_user_id.eq.${userId},invited_email.ilike.${normalizedEmail}`)
    .limit(PENDING_INVITATION_SYNC_LIMIT);

  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function linkInvitationToUser(invitationId: string, userId: string): Promise<void> {
  const { error: linkInviteError } = await supabase
    .from('group_invitations')
    .update({ invited_user_id: userId })
    .eq('id', invitationId);

  if (linkInviteError) {
    throw linkInviteError;
  }
}

export async function linkGroupMemberToUser(groupMemberId: string, userId: string): Promise<void> {
  const { error: linkMemberError } = await supabase
    .from('group_members')
    .update({ user_id: userId })
    .eq('id', groupMemberId);

  if (linkMemberError) {
    throw linkMemberError;
  }
}

export async function fetchGroupsAndProfilesForEnrichment(
  groupIds: string[],
  inviterIds: string[],
): Promise<{
  groups: Array<{ id: string; name: string; type: string | null }>;
  profiles: Array<{ id: string; display_name: string | null; email: string | null }>;
}> {
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

  return {
    groups: groups ?? [],
    profiles: profiles ?? [],
  };
}

export async function fetchGroupNameAndType(
  groupId: string,
): Promise<{ name: string; type: string | null } | null> {
  const { data: group } = await supabase
    .from('groups')
    .select('name, type')
    .eq('id', groupId)
    .maybeSingle();
  return group;
}

export async function fetchGroupName(groupId: string): Promise<string | undefined> {
  const { data: groupRow } = await supabase.from('groups').select('name').eq('id', groupId).maybeSingle();
  return groupRow?.name ?? undefined;
}

export async function activateGroupMemberOnAccept(
  groupMemberId: string,
  userId: string,
  email: string,
): Promise<string> {
  const { data: memberRow, error: memberError } = await supabase
    .from('group_members')
    .update({
      user_id: userId,
      email,
      invitation_status: 'active',
      is_active: true,
    })
    .eq('id', groupMemberId)
    .select('id')
    .single();

  if (memberError) {
    throw memberError;
  }
  if (!memberRow) {
    throw new Error('Could not activate group membership.');
  }
  return memberRow.id;
}

export async function markInvitationAccepted(
  invitationId: string,
  userId: string,
): Promise<void> {
  const { error: updateInvitationError } = await supabase
    .from('group_invitations')
    .update({
      status: 'accepted',
      invited_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitationId);

  if (updateInvitationError) {
    throw updateInvitationError;
  }
}

export async function markInvitationDeclined(invitationId: string): Promise<GroupInvitationRow> {
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

  return invitation;
}

export async function markMemberDeclined(groupMemberId: string): Promise<void> {
  const { error: memberError } = await supabase
    .from('group_members')
    .update({
      invitation_status: 'declined',
      is_active: false,
    })
    .eq('id', groupMemberId);

  if (memberError) {
    throw memberError;
  }
}

export async function fetchInvitationByGroupMemberId(groupMemberId: string): Promise<GroupInvitation | null> {
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
}

export async function fetchInvitationRowForCancel(invitationId: string): Promise<GroupInvitationRow> {
  const { data: invitation, error: invitationError } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (invitationError) {
    throw invitationError;
  }
  return invitation;
}

export async function markInvitationCancelled(invitationId: string): Promise<void> {
  const { error: updateInvitationError } = await supabase
    .from('group_invitations')
    .update({
      status: 'cancelled',
    })
    .eq('id', invitationId);

  if (updateInvitationError) {
    throw updateInvitationError;
  }
}

export async function markMemberCancelled(groupMemberId: string): Promise<void> {
  const { error: memberError } = await supabase
    .from('group_members')
    .update({
      invitation_status: 'cancelled',
      is_active: false,
    })
    .eq('id', groupMemberId);

  if (memberError) {
    throw memberError;
  }
}

export async function fetchInvitationRowForAccept(invitationId: string): Promise<GroupInvitationRow> {
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
  return invitation;
}

export async function getCurrentAuthUser(): Promise<{ id: string; email: string } | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }
  const user = userData.user;
  if (!user?.email) {
    return null;
  }
  return { id: user.id, email: user.email };
}
