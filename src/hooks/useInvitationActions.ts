import { useCallback, useState } from 'react';

import {
  acceptInvitation,
  declineInvitation,
  type AcceptInvitationResult,
} from '../services/invitationService';
import { createLogger } from '../utils/logger';

const logger = createLogger('useInvitationActions');

export function useInvitationActions(onComplete?: () => void | Promise<void>) {
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
        await onComplete?.();
        return result;
      } catch (err) {
        logger.error('Accept invitation failed', err, { invitationId });
        setError(err instanceof Error ? err.message : 'Unable to accept invitation.');
        return null;
      } finally {
        setProcessingId(null);
      }
    },
    [onComplete],
  );

  const decline = useCallback(
    async (invitationId: string) => {
      setProcessingId(invitationId);
      setError(null);
      logger.info('Decline invitation started', { invitationId });
      try {
        await declineInvitation(invitationId);
        logger.info('Decline invitation succeeded', { invitationId });
        await onComplete?.();
        return true;
      } catch (err) {
        logger.error('Decline invitation failed', err, { invitationId });
        setError(err instanceof Error ? err.message : 'Unable to decline invitation.');
        return false;
      } finally {
        setProcessingId(null);
      }
    },
    [onComplete],
  );

  return {
    accept,
    decline,
    processingId,
    error,
    clearError: () => setError(null),
  };
}
