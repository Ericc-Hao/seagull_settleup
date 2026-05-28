import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useAppData } from '../context/AppDataContext';
import {
  cancelInvitation,
  getInvitationByGroupMemberId,
  resendInvitation,
} from '../services/invitationService';
import { memberHasExpenseParticipation } from '../services/expenseService';
import { deactivateGroupMember } from '../services/memberService';
import type { GroupMemberWithProfile } from '../types/views';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { invalidateAfterGroupMemberChange } from '../utils/mutationInvalidation';

const logger = createLogger('useGroupMemberActions');

export function useGroupMemberActions(groupId: string, refreshMembers: () => Promise<void>) {
  const { invalidate } = useAppData();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const removeMember = useCallback(
    async (memberId: string) => {
      logger.info('Remove member started', { groupId, memberId });
      setActionLoading(true);
      setActionError(undefined);
      try {
        await deactivateGroupMember(memberId, groupId);
        invalidateAfterGroupMemberChange(invalidate, groupId);
        await refreshMembers();
        logger.info('Remove member succeeded', { groupId, memberId });
      } catch (error) {
        logger.error('Remove member failed', error, { groupId, memberId });
        setActionError(toUserFriendlyError(error, 'Unable to remove member.'));
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [groupId, invalidate, refreshMembers],
  );

  const cancelMemberInvitation = useCallback(
    async (member: GroupMemberWithProfile) => {
      const runCancel = async () => {
        logger.info('Cancel invitation started', { groupId, memberId: member.id });
        setActionLoading(true);
        setActionError(undefined);
        try {
          const invitationId =
            member.invitationId ?? (await getInvitationByGroupMemberId(member.id))?.id;
          if (!invitationId) {
            throw new Error('No pending invitation found for this member.');
          }
          await cancelInvitation(invitationId);
          invalidateAfterGroupMemberChange(invalidate, groupId);
          await refreshMembers();
          logger.info('Cancel invitation succeeded', { groupId, memberId: member.id, invitationId });
        } catch (error) {
          logger.error('Cancel invitation failed', error, { groupId, memberId: member.id });
          setActionError(toUserFriendlyError(error, 'Unable to cancel invitation.'));
          throw error;
        } finally {
          setActionLoading(false);
        }
      };

      if (memberHasExpenseParticipation(member.id)) {
        Alert.alert(
          'Remove pending member?',
          'This pending member is included in existing expenses. Removing the invitation will stop them from future splits but keep historical records.',
          [
            { text: 'Keep Invitation', style: 'cancel' },
            { text: 'Remove Anyway', style: 'destructive', onPress: () => void runCancel() },
          ],
        );
        return;
      }

      await runCancel();
    },
    [groupId, invalidate, refreshMembers],
  );

  const resendMemberInvitation = useCallback(
    async (invitationId: string) => {
      logger.info('Resend invitation started', { groupId, invitationId });
      setActionLoading(true);
      setActionError(undefined);
      try {
        const result = await resendInvitation(invitationId);
        invalidateAfterGroupMemberChange(invalidate, groupId);
        await refreshMembers();

        if (!result.sent) {
          const message = result.error ?? 'Unable to send the reminder email.';
          setActionError(message);
          Alert.alert('Unable to resend invitation', message);
          return result;
        }

        Alert.alert('Invitation sent', 'The reminder email was sent successfully.');
        logger.info('Resend invitation succeeded', { groupId, invitationId });
        return result;
      } catch (error) {
        logger.error('Resend invitation failed', error, { groupId, invitationId });
        const message = toUserFriendlyError(error, 'Unable to resend invitation.');
        setActionError(message);
        Alert.alert('Unable to resend invitation', message);
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [groupId, invalidate, refreshMembers],
  );

  return {
    removeMember,
    cancelMemberInvitation,
    resendMemberInvitation,
    actionLoading,
    actionError,
    clearActionError: () => setActionError(undefined),
  };
}
