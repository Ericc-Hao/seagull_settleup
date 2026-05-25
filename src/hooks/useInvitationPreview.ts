import { useEffect, useState } from 'react';

import { getInvitationPreviewByToken } from '../services/invitationService';
import type { InvitationPreviewView } from '../types/views';
import { createLogger } from '../utils/logger';

const logger = createLogger('useInvitationPreview');

export function useInvitationPreview(inviteToken?: string) {
  const [preview, setPreview] = useState<InvitationPreviewView | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    const trimmed = inviteToken?.trim();
    if (!trimmed) {
      setPreview(null);
      setFetchFailed(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setFetchFailed(false);
    logger.info('Invite preview fetch started', { hasInviteToken: true });

    void getInvitationPreviewByToken(trimmed)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setPreview(result);
        if (result?.isValid) {
          logger.info('Invite preview fetch succeeded', { invitationId: result.invitationId });
        } else {
          logger.info('Invite preview fetch succeeded', { invitationId: result?.invitationId, isValid: false });
        }
      })
      .catch((error) => {
        logger.error('Invite preview fetch failed', error);
        if (mounted) {
          setPreview(null);
          setFetchFailed(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [inviteToken]);

  const isPendingInvite = preview?.status === 'pending' && Boolean(preview.isValid);

  return { preview, loading, fetchFailed, isPendingInvite };
}
