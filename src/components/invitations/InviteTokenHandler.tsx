import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { BottomSheet } from '../common/BottomSheet';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useInvitationActions } from '../../hooks/useInvitationActions';
import { clearPendingInviteToken, getPendingInviteToken } from '../../lib/pendingInviteToken';
import {
  getInvitationPreviewByToken,
  getPendingInvitationByToken,
  syncPendingInvitationsForCurrentUser,
} from '../../services/invitationService';
import { colors, spacing, typography } from '../../theme';
import type { PendingInvitationView } from '../../types/views';
import { createLogger } from '../../utils/logger';
import { maskEmail, normalizeEmail } from '../../utils/validation';
import { InvitationActionModal } from './InvitationActionModal';

const logger = createLogger('InviteTokenHandler');

export function InviteTokenHandler() {
  const { refresh } = useAppData();
  const { user, signOut } = useAuth();
  const [invitation, setInvitation] = useState<PendingInvitationView | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mismatchEmail, setMismatchEmail] = useState<string | null>(null);
  const handledTokenRef = useRef<string | null>(null);

  const closeModal = useCallback(async () => {
    setModalVisible(false);
    setInvitation(null);
    setMismatchEmail(null);
    await clearPendingInviteToken();
  }, []);

  const onComplete = useCallback(async () => {
    await refresh();
    await syncPendingInvitationsForCurrentUser();
  }, [refresh]);

  const { accept, decline, processingId, clearError } = useInvitationActions(onComplete);

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
      setMismatchEmail(null);
      logger.info('Invite token flow started', { target: 'InvitationActionModal' });

      try {
        const preview = await getInvitationPreviewByToken(token);
        const sessionEmail = user?.email?.trim();
        const invitedEmail = preview?.invitedEmail?.trim();

        if (
          preview?.isValid &&
          sessionEmail &&
          invitedEmail &&
          normalizeEmail(sessionEmail) !== normalizeEmail(invitedEmail)
        ) {
          setMismatchEmail(invitedEmail);
          setInvitation(null);
          return;
        }

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
  }, [user?.email]);

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

  const handleLogoutForMismatch = useCallback(async () => {
    const token = handledTokenRef.current;
    await closeModal();
    await signOut();
    if (token) {
      router.replace(`/login?invite=${encodeURIComponent(token)}`);
    }
  }, [closeModal, signOut]);

  if (!modalVisible) {
    return null;
  }

  if (mismatchEmail) {
    return (
      <BottomSheet visible={modalVisible} title="Wrong account" onClose={() => void closeModal()}>
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
            This invitation was sent to {maskEmail(mismatchEmail)}. Please switch accounts to accept it.
          </Text>
          <PrimaryButton label="Log Out" onPress={() => void handleLogoutForMismatch()} />
          <SecondaryButton label="Not Now" variant="outline" onPress={() => void closeModal()} />
        </View>
      </BottomSheet>
    );
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
