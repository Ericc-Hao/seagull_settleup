import type { GroupMember } from '../types/models';
import type { GroupMemberWithProfile } from '../types/views';
import { avatarInitials } from './avatar';

export type GroupParticipantStatus = 'active' | 'pending';

/** Unified participant identity for split and payment flows. */
export interface GroupParticipant {
  id: string;
  memberId: string;
  invitationId?: string | null;
  userId?: string | null;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarLabel: string;
  status: GroupParticipantStatus;
  participantType: 'member';
  role?: string;
  invitationStatus?: GroupMemberWithProfile['invitationStatus'];
  isRegistered: boolean;
  canBeSelectedForSplit: boolean;
  canBePaidBy: boolean;
}

function emailPrefix(email?: string | null): string {
  return email?.split('@')[0]?.trim() || 'Member';
}

/** Active owner, active member, or pending invited member eligible for new splits. */
export function isSplitSelectableMember(member: Pick<GroupMemberWithProfile, 'role' | 'invitationStatus' | 'isActive'>): boolean {
  if (member.role === 'owner') {
    return true;
  }
  const status = member.invitationStatus ?? 'active';
  if (status === 'pending') {
    return true;
  }
  if (status === 'active') {
    return member.isActive !== false;
  }
  return false;
}

/** Same eligibility as split selection — used for balance/settlement calculations. */
export function isBalanceEligibleMember(member: Pick<GroupMember, 'role' | 'invitationStatus' | 'isActive'>): boolean {
  return isSplitSelectableMember(member);
}

export function filterSplitSelectableMembers(members: GroupMemberWithProfile[]): GroupMemberWithProfile[] {
  return members.filter(isSplitSelectableMember);
}

export function toGroupParticipant(member: GroupMemberWithProfile): GroupParticipant {
  const pending = isPendingParticipant(member);
  const selectable = isSplitSelectableMember(member);
  return {
    id: member.id,
    memberId: member.id,
    invitationId: member.invitationId ?? null,
    userId: member.userId ?? null,
    email: member.email ?? '',
    displayName: member.displayName,
    avatarUrl: member.avatarUrl ?? null,
    avatarLabel: member.avatarLabel,
    status: pending ? 'pending' : 'active',
    participantType: 'member',
    role: member.role,
    invitationStatus: member.invitationStatus,
    isRegistered: member.isRegistered,
    canBeSelectedForSplit: selectable,
    canBePaidBy: selectable,
  };
}

/** Registered active member or group owner — never show a pending badge. */
export function isActiveRegisteredMember(
  participant: Pick<GroupMemberWithProfile, 'invitationStatus' | 'userId' | 'role' | 'isActive'> & {
    participantType?: 'member' | 'invitation';
  },
): boolean {
  if (participant.participantType === 'invitation') {
    return false;
  }
  if (participant.role === 'owner') {
    return true;
  }
  const status = participant.invitationStatus ?? 'active';
  return Boolean(participant.userId) && status !== 'pending' && participant.isActive !== false;
}

/**
 * True only for pending invitees — not owners, not accepted/active registered members.
 */
export function isPendingParticipant(
  participant: Pick<GroupMemberWithProfile, 'invitationStatus' | 'userId' | 'role' | 'isActive'> & {
    participantType?: 'member' | 'invitation';
  },
): boolean {
  if (participant.participantType === 'invitation') {
    return true;
  }
  if (isActiveRegisteredMember(participant)) {
    return false;
  }
  if (participant.role === 'owner') {
    return false;
  }
  return participant.invitationStatus === 'pending';
}

export function participantStatusLabel(
  member: Pick<GroupMemberWithProfile, 'invitationStatus' | 'userId' | 'role' | 'isActive'> & {
    participantType?: 'member' | 'invitation';
  },
): string | undefined {
  if (isPendingParticipant(member)) {
    return 'Pending';
  }
  return undefined;
}

export function resolveDisplayNameFromMember(
  member: Pick<GroupMember, 'displayName' | 'email'>,
  profileDisplayName?: string | null,
): string {
  return profileDisplayName?.trim() || member.displayName?.trim() || emailPrefix(member.email);
}

export function resolveAvatarLabel(displayName: string, email?: string | null): string {
  return avatarInitials(displayName, email ?? undefined);
}
