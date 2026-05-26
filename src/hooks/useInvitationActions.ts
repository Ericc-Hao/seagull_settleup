import { useCallback, useState } from 'react';

import {
  acceptInvitation,
  declineInvitation,
  type AcceptInvitationResult,
} from '../services/invitationService';
import { createLogger } from '../utils/logger';

const logger = createLogger('useInvitationActions');

export interface InvitationActionCallbacks {
  onAcceptComplete?: () => void | Promise<void>;
  onDeclineComplete?: () => void | Promise<void>;
}

export function useInvitationActions(
  callbacks?: InvitationActionCallbacks | (() => void | Promise<void>),
) {
  const onAcceptComplete =
    typeof callbacks === 'function' ? callbacks : callbacks?.onAcceptComplete;
  const onDeclineComplete =
    typeof callbacks === 'function' ? callbacks : callbacks?.onDeclineComplete;

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    async (invitationId: string): Promise<AcceptInvitationResult | null> => {
      setProcessingId(invitationId);
      setError(null);
      logger.info('Accept invitation started', { invitationId });
      try {
        const result = await acceptInvitation(invitationId);
        logger.info('Accept invitation succeeded', { invitationId, groupId: result.groupId });
        await onAcceptComplete?.();
        return result;
      } catch (err) {
        logger.error('Accept invitation failed', err, { invitationId });
        setError(err instanceof Error ? err.message : 'Unable to accept invitation.');
        return null;
      } finally {
        setProcessingId(null);
      }
    },
    [onAcceptComplete],
  );

  const decline = useCallback(
    async (invitationId: string) => {
      setProcessingId(invitationId);
      setError(null);
      logger.info('Decline invitation started', { invitationId });
      try {
        await declineInvitation(invitationId);
        logger.info('Decline invitation succeeded', { invitationId });
        await onDeclineComplete?.();
        return true;
      } catch (err) {
        logger.error('Decline invitation failed', err, { invitationId });
        setError(err instanceof Error ? err.message : 'Unable to decline invitation.');
        return false;
      } finally {
        setProcessingId(null);
      }
    },
    [onDeclineComplete],
  );

  return {
    accept,
    decline,
    processingId,
    error,
    clearError: () => setError(null),
  };
}
