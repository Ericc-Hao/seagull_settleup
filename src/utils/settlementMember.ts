import type { GroupMember, Profile } from '../types/models';
import { avatarInitials } from './avatar';

export interface SettlementMemberInfo {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  avatarLabel: string;
  emtEmail?: string;
  emtPhone?: string;
  /** Primary destination for payment copy — emt_email when set, else profile/member email */
  transferEmail?: string;
}

function emailPrefix(email?: string | null): string {
  return email?.split('@')[0]?.trim() || 'Member';
}

function findProfileForMember(member: GroupMember, profiles: Profile[]): Profile | undefined {
  if (member.userId) {
    const byUser = profiles.find((profile) => profile.userId === member.userId);
    if (byUser) {
      return byUser;
    }
  }
  if (member.email) {
    const normalized = member.email.trim().toLowerCase();
    return profiles.find((profile) => profile.email?.trim().toLowerCase() === normalized);
  }
  return undefined;
}

export function resolveSettlementMember(
  member: GroupMember,
  profiles: Profile[] = [],
): SettlementMemberInfo {
  const profile = findProfileForMember(member, profiles);
  const profileEmail = profile?.email?.trim() || member.email?.trim() || undefined;
  const displayName =
    profile?.displayName?.trim() ||
    member.displayName?.trim() ||
    member.nickname?.trim() ||
    emailPrefix(profileEmail);
  const email = profileEmail;
  const emtEmail = member.emtEmail?.trim() || profile?.emtEmail?.trim() || undefined;
  const emtPhone =
    member.emtPhone?.trim() || profile?.emtPhone?.trim() || profile?.phone?.trim() || undefined;
  const transferEmail = emtEmail ?? email;

  return {
    id: member.id,
    displayName,
    email,
    avatarUrl: profile?.avatarUrl,
    avatarLabel: avatarInitials(displayName, email),
    emtEmail,
    emtPhone,
    transferEmail,
  };
}

export function buildMemberDisplayLabel(
  memberId: string,
  memberMap: Map<string, SettlementMemberInfo>,
): string {
  return memberMap.get(memberId)?.displayName ?? 'Member';
}

export function buildTeamDisplayLabel(
  memberIds: string[],
  memberMap: Map<string, SettlementMemberInfo>,
): string {
  const labels = memberIds.map((id) => buildMemberDisplayLabel(id, memberMap));
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} + ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(', ')} + ${labels[labels.length - 1]}`;
}
