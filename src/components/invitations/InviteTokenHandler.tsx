import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppData } from '../../context/AppDataContext';
import { useInvitationActions } from '../../hooks/useInvitationActions';
import { clearPendingInviteToken, getPendingInviteToken } from '../../lib/pendingInviteToken';
import {
  getPendingInvitationByToken,
  syncPendingInvitationsForCurrentUser,
} from '../../services/invitationService';
import type { PendingInvitationView } from '../../types/views';
import { createLogger } from '../../utils/logger';
import { InvitationActionModal } from './InvitationActionModal';

const logger = createLogger('InviteTokenHandler');

export function InviteTokenHandler() {
  const { refresh } = useAppData();
  const [invitation, setInvitation] = useState<PendingInvitationView | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const handledTokenRef = useRef<string | null>(null);

  const closeModal = useCallback(async () => {
    setModalVisible(false);
    setInvitation(null);
    await clearPendingInviteToken();
  }, []);

  const onComplete = useCallback(async () => {
    await refresh();
    await syncPendingInvitationsForCurrentUser();
  }, [refresh]);

  const { accept, decline, processingId, error, clearError } = useInvitationActions(onComplete);

  useEffect(() => {
    let mounted = true;

    const openInviteModal = async () => {
      const token = await getPendingInviteToken();
      if (!token || !mounted || handledTokenRef.current === token) {
        return;
      }

      handledTokenRef.current = token;
      setLoading(true);
      setModalVisible(true);
      logger.info('Invite token flow started', { target: 'InvitationActionModal' });

      try {
        const pendingInvitation = await getPendingInvitationByToken(token);
        if (!mounted) {
          return;
        }
        if (pendingInvitation?.status === 'pending') {
          setInvitation(pendingInvitation);
        } else {
          setInvitation(null);
          await clearPendingInviteToken();
        }
      } catch (err) {
        logger.error('Invite token flow failed', err);
        if (mounted) {
          setInvitation(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void openInviteModal();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAccept = useCallback(async () => {
    if (!invitation) {
      return;
    }
    clearError();
    const result = await accept(invitation.id);
    if (!result) {
      return;
    }
    await clearPendingInviteToken();
    setModalVisible(false);
    setInvitation(null);
    router.push(`/group/${result.groupId}`);
  }, [accept, clearError, invitation]);

  const handleDecline = useCallback(async () => {
    if (!invitation) {
      return;
    }
    clearError();
    const declined = await decline(invitation.id);
    if (!declined) {
      return;
    }
    await closeModal();
  }, [closeModal, clearError, decline, invitation]);

  if (!modalVisible) {
    return null;
  }

  return (
    <InvitationActionModal
      visible={modalVisible}
      invitation={invitation}
      loading={loading}
      processing={Boolean(processingId)}
      onAccept={() => void handleAccept()}
      onDecline={() => void handleDecline()}
      onClose={() => void closeModal()}
      onViewGroup={
        invitation?.groupId
          ? () => {
              void closeModal();
              router.push(`/group/${invitation.groupId}`);
            }
          : undefined
      }
    />
  );
}
