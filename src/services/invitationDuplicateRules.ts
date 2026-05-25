import { normalizeEmail } from '../utils/validation';

export type InviteDuplicateReason = 'active_member' | 'pending_invitation';

export interface MemberEmailRow {
  email: string | null;
  invitation_status: string;
  is_active: boolean;
  role?: string;
}

export function isBlockingGroupMember(row: MemberEmailRow): boolean {
  if (!row.email?.trim()) {
    return false;
  }
  if (row.role === 'owner') {
    return true;
  }
  if (row.invitation_status === 'pending') {
    return true;
  }
  if (row.invitation_status === 'active' && row.is_active) {
    return true;
  }
  return false;
}

export function buildGroupEmailOccupancy(
  members: MemberEmailRow[],
  pendingInvitationEmails: string[],
): { activeMemberEmails: Set<string>; pendingInvitationEmails: Set<string> } {
  const activeMemberEmails = new Set<string>();
  const pendingEmails = new Set(pendingInvitationEmails.map(normalizeEmail));

  for (const row of members) {
    if (!isBlockingGroupMember(row)) {
      continue;
    }
    const email = normalizeEmail(row.email!);
    if (row.role === 'owner' || (row.invitation_status === 'active' && row.is_active)) {
      activeMemberEmails.add(email);
      continue;
    }
    if (row.invitation_status === 'pending') {
      pendingEmails.add(email);
    }
  }

  return { activeMemberEmails, pendingInvitationEmails: pendingEmails };
}

export function classifyInviteDuplicate(
  email: string,
  occupancy: { activeMemberEmails: Set<string>; pendingInvitationEmails: Set<string> },
): InviteDuplicateReason | null {
  const normalized = normalizeEmail(email);
  if (occupancy.activeMemberEmails.has(normalized)) {
    return 'active_member';
  }
  if (occupancy.pendingInvitationEmails.has(normalized)) {
    return 'pending_invitation';
  }
  return null;
}

export function duplicateInviteWarning(reason: InviteDuplicateReason): string {
  if (reason === 'active_member') {
    return 'This email is already a member of this group.';
  }
  return 'This email already has a pending invitation. You can resend the reminder email.';
}

export const REUSABLE_MEMBER_STATUSES = ['cancelled', 'declined', 'removed'] as const;
