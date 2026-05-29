import type { GroupInvitation, GroupMember } from '../../types/models';

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

export interface InvitationDetailFallback {
  groupId?: string;
  groupName?: string;
  inviterName?: string;
  inviterEmail?: string;
  invitedEmail?: string;
  invitedBy?: string;
  createdAt?: string;
}

export const INVITATION_LINK_GENERATION_ERROR =
  'Invitation link could not be generated. Please try again.';
