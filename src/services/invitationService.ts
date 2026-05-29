/**
 * Compatibility facade — re-exports the invitation module public API.
 * Prefer importing from './invitations' for new code.
 */
export type {
  AcceptInvitationResult,
  InvitationDetailFallback,
  InvitationEmailResult,
  InviteMembersResult,
} from './invitations';

export {
  acceptInvitation,
  cancelInvitation,
  createGroupInvitation,
  createGroupInvitations,
  declineInvitation,
  formatInvitationMessage,
  getInvitationByGroupMemberId,
  getInvitationDetail,
  getInvitationPreviewByToken,
  getInvitationViewById,
  getPendingInvitationByToken,
  getPendingInvitationsForCurrentUser,
  hasDuplicateInviteEmailInGroup,
  invitationFallbackFromNotification,
  inviteMoreMembers,
  resendInvitation,
  sendGroupInvitationEmail,
  sendInvitationEmail,
  syncPendingInvitationsForCurrentUser,
} from './invitations';
