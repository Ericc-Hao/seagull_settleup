import { mapGroupMember } from '../lib/mappers';
import { refreshCache } from '../lib/supabaseSnapshot';
import { supabase } from '../lib/supabase';
import type { AddGroupMemberInput, UpdateGroupMemberInput } from '../types/inputs';
import type { GroupMember } from '../types/models';
import type { GroupMemberWithProfile } from '../types/views';
import { getCachedUserId } from '../lib/auth';
import { createLogger } from '../utils/logger';
import { avatarInitials } from '../utils/avatar';
import { getGroupMembers, readDb } from './dbHelpers';
import { findProfileByEmail, getAvatarUrl } from './profileService';

const logger = createLogger('memberService');

type ProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
};

type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string;
  nickname: string | null;
  avatar_color: string | null;
  role: string;
  invitation_status: GroupMember['invitationStatus'];
  is_active: boolean;
  created_at: string;
};

function normalizeMemberWithProfile(
  row: GroupMemberRow,
  profile: ProfileRow | undefined,
  invitationId?: string,
  emailProfile?: { displayName?: string; email?: string; avatarUrl?: string; userId?: string } | null,
): GroupMemberWithProfile {
  const profileDisplayName = profile?.display_name?.trim() || emailProfile?.displayName?.trim();
  const profileEmail = profile?.email ?? emailProfile?.email ?? undefined;
  const memberEmail = row.email ?? profileEmail;
  const displayName =
    profileDisplayName || row.display_name?.trim() || emailPrefix(memberEmail);
  const email = profileEmail || memberEmail || undefined;
  const userId = row.user_id ?? emailProfile?.userId ?? undefined;
  const avatarUrl = getAvatarUrl(profile?.avatar_url ?? emailProfile?.avatarUrl);

  return {
    id: row.id,
    groupId: row.group_id,
    userId,
    email,
    displayName,
    role: row.role,
    invitationStatus: row.invitation_status,
    isActive: row.is_active,
    avatarUrl,
    avatarLabel: avatarInitials(displayName, email),
    isRegistered: Boolean(userId),
    invitationId,
  };
}

function emailPrefix(email?: string | null): string {
  return email?.split('@')[0]?.trim() || 'Member';
}

async function assertGroupOwner(groupId: string): Promise<void> {
  const userId = getCachedUserId();
  const { data, error } = await supabase.from('groups').select('owner_id').eq('id', groupId).single();
  if (error) {
    throw error;
  }
  if (data.owner_id !== userId) {
    throw new Error('Only the group owner can manage members.');
  }
}

export function getGroupMembersByGroup(groupId: string): GroupMember[] {
  return getGroupMembers(groupId);
}

export async function getGroupMembersWithProfiles(groupId: string): Promise<GroupMemberWithProfile[]> {
  logger.debug('Get group members with profiles started', { table: 'group_members', groupId });
  try {
    const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] =
      await Promise.all([
        supabase
          .from('group_members')
          .select(
            'id, group_id, user_id, email, display_name, nickname, avatar_color, role, invitation_status, is_active, created_at',
          )
          .eq('group_id', groupId)
          .order('created_at', { ascending: true }),
        supabase
          .from('group_invitations')
          .select('id, group_member_id, status')
          .eq('group_id', groupId)
          .eq('status', 'pending'),
      ]);

    if (membersError) {
      throw membersError;
    }
    if (invitationsError) {
      throw invitationsError;
    }

    const invitationByMemberId = new Map(
      (invitations ?? [])
        .filter((row) => row.group_member_id)
        .map((row) => [row.group_member_id as string, row.id as string]),
    );

    const rows = (members ?? []) as GroupMemberRow[];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean) as string[]));

    let profilesById = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        throw profilesError;
      }

      profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    }
    const emailProfiles = new Map<string, Awaited<ReturnType<typeof findProfileByEmail>>>();

    for (const row of rows) {
      if (row.user_id || !row.email) {
        continue;
      }
      const normalizedEmail = row.email.trim().toLowerCase();
      if (emailProfiles.has(normalizedEmail)) {
        continue;
      }
      const profile = await findProfileByEmail(normalizedEmail);
      emailProfiles.set(normalizedEmail, profile);
    }

    const result = rows.map((row) => {
      const profile = row.user_id ? profilesById.get(row.user_id) : undefined;
      const emailProfile = row.email ? emailProfiles.get(row.email.trim().toLowerCase()) : null;
      return normalizeMemberWithProfile(row, profile, invitationByMemberId.get(row.id), emailProfile);
    });

    logger.debug('Get group members with profiles succeeded', {
      table: 'group_members',
      groupId,
      count: result.length,
    });
    return result;
  } catch (error) {
    logger.error('Get group members with profiles failed', error, { table: 'group_members', groupId });
    throw error;
  }
}

export async function addGroupMember(input: AddGroupMemberInput): Promise<GroupMember> {
  logger.info('Add group member started', { table: 'group_members', groupId: input.groupId });
  try {
    const { data: row, error } = await supabase.from('group_members').insert({
      group_id: input.groupId,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      display_name: input.displayName,
      nickname: input.nickname ?? null,
      avatar_color: input.avatarColor ?? null,
      emt_email: input.emtEmail ?? null,
      emt_phone: input.emtPhone ?? null,
      preferred_emt_method: input.preferredEmtMethod ?? null,
      role: input.role ?? 'member',
      invitation_status: input.invitationStatus ?? 'active',
      is_active: input.isActive ?? true,
    }).select('*').single();
    if (error) {
      throw error;
    }
    const member = mapGroupMember(row);

    if (input.teamId) {
      await supabase.from('team_members').insert({
        team_id: input.teamId,
        member_id: member.id,
      });
    }

    await refreshCache();
    logger.info('Add group member succeeded', { table: 'group_members', memberId: member.id, groupId: input.groupId });
    return readDb().groupMembers.find((entry) => entry.id === member.id) ?? member;
  } catch (error) {
    logger.error('Add group member failed', error, { table: 'group_members', groupId: input.groupId });
    throw error;
  }
}

export async function updateGroupMember(
  memberId: string,
  input: UpdateGroupMemberInput,
): Promise<GroupMember> {
  logger.info('Update group member started', { table: 'group_members', memberId });
  try {
    const { error } = await supabase
      .from('group_members')
      .update({
        display_name: input.displayName,
        nickname: input.nickname,
        avatar_color: input.avatarColor,
        emt_email: input.emtEmail,
        emt_phone: input.emtPhone,
        preferred_emt_method: input.preferredEmtMethod,
        role: input.role,
        invitation_status: input.invitationStatus,
        is_active: input.isActive,
      })
      .eq('id', memberId);
    if (error) {
      throw error;
    }
    await refreshCache();
    const member = readDb().groupMembers.find((entry) => entry.id === memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }
    logger.info('Update group member succeeded', { table: 'group_members', memberId });
    return member;
  } catch (error) {
    logger.error('Update group member failed', error, { table: 'group_members', memberId });
    throw error;
  }
}

export async function updateGroupMemberStatus(
  memberId: string,
  status: GroupMember['invitationStatus'],
  groupId: string,
): Promise<void> {
  logger.info('Update group member status started', { memberId, status, groupId });
  await assertGroupOwner(groupId);
  try {
    const { error } = await supabase
      .from('group_members')
      .update({
        invitation_status: status,
        is_active: status === 'active',
      })
      .eq('id', memberId);
    if (error) {
      throw error;
    }
    await refreshCache();
    logger.info('Update group member status succeeded', { memberId, status, groupId });
  } catch (error) {
    logger.error('Update group member status failed', error, { memberId, status, groupId });
    throw error;
  }
}

export async function deactivateGroupMember(memberId: string, groupId: string): Promise<void> {
  logger.info('Deactivate group member started', { memberId, groupId });
  await assertGroupOwner(groupId);

  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .select('role')
    .eq('id', memberId)
    .single();

  if (memberError) {
    throw memberError;
  }
  if (member.role === 'owner') {
    throw new Error('The group owner cannot be removed.');
  }

  try {
    const { error } = await supabase
      .from('group_members')
      .update({
        is_active: false,
        invitation_status: 'removed',
      })
      .eq('id', memberId);

    if (error) {
      throw error;
    }
    await refreshCache();
    logger.info('Deactivate group member succeeded', { memberId, groupId });
  } catch (error) {
    logger.error('Deactivate group member failed', error, { memberId, groupId });
    throw error;
  }
}

/** @deprecated Use deactivateGroupMember for soft removal */
export async function removeGroupMember(memberId: string, groupId: string): Promise<void> {
  return deactivateGroupMember(memberId, groupId);
}

export function filterDetailMembers(members: GroupMemberWithProfile[]): GroupMemberWithProfile[] {
  return members.filter(
    (member) =>
      member.role === 'owner' ||
      member.invitationStatus === 'active' ||
      member.invitationStatus === 'pending',
  );
}

export function partitionMembers(members: GroupMemberWithProfile[]) {
  const active = members.filter(
    (m) => m.role === 'owner' || (m.invitationStatus === 'active' && m.isActive !== false),
  );
  const pending = members.filter((m) => m.invitationStatus === 'pending');
  const inactive = members.filter(
    (m) =>
      m.invitationStatus === 'declined' ||
      m.invitationStatus === 'removed' ||
      m.invitationStatus === 'cancelled' ||
      (m.isActive === false && m.invitationStatus !== 'pending'),
  );
  return { active, pending, inactive };
}
