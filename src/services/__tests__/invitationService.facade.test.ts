import { describe, expect, it } from 'vitest';

import * as invitationService from '../invitationService';

const PUBLIC_FUNCTION_EXPORTS = [
  'acceptInvitation',
  'cancelInvitation',
  'createGroupInvitation',
  'createGroupInvitations',
  'declineInvitation',
  'formatInvitationMessage',
  'getInvitationByGroupMemberId',
  'getInvitationDetail',
  'getInvitationPreviewByToken',
  'getInvitationViewById',
  'getPendingInvitationByToken',
  'getPendingInvitationsForCurrentUser',
  'hasDuplicateInviteEmailInGroup',
  'invitationFallbackFromNotification',
  'inviteMoreMembers',
  'resendInvitation',
  'sendGroupInvitationEmail',
  'sendInvitationEmail',
  'syncPendingInvitationsForCurrentUser',
] as const;

describe('invitationService facade', () => {
  it('re-exports all previous public functions', () => {
    for (const exportName of PUBLIC_FUNCTION_EXPORTS) {
      expect(typeof invitationService[exportName]).toBe('function');
    }
  });

  it('re-exports invitationFallbackFromNotification as a stable helper', () => {
    const fallback = invitationService.invitationFallbackFromNotification({
      createdAt: '2026-05-29T00:00:00.000Z',
      data: {
        groupId: 'group-1',
        groupName: 'Weekend',
        inviterName: 'Eric',
        invitedEmail: 'friend@example.com',
        invitationId: 'inv-1',
      },
    });

    expect(fallback).toEqual({
      groupId: 'group-1',
      groupName: 'Weekend',
      inviterName: 'Eric',
      inviterEmail: undefined,
      invitedEmail: 'friend@example.com',
      invitedBy: undefined,
      createdAt: '2026-05-29T00:00:00.000Z',
    });
  });
});
