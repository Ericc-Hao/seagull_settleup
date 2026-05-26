import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { EmptyStateCard, PrimaryButton, ScreenLayout } from '../components';
import { headerLayout } from '../components/common/headerLayout';
import { InvitationActionModal } from '../components/invitations/InvitationActionModal';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { NotificationsListSkeleton } from '../components/notifications/NotificationsListSkeleton';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationsContext';
import { useInvitationActions } from '../hooks/useInvitationActions';
import { invalidateAfterAcceptInvitation, invalidateAfterDeclineInvitation } from '../utils/mutationInvalidation';
import {
  getInvitationDetail,
  invitationFallbackFromNotification,
} from '../services/invitationService';
import type { Notification } from '../types/models';
import type { PendingInvitationView } from '../types/views';
import { createLogger } from '../utils/logger';
import { colors, layout, typography } from '../theme';
import { Icon } from '../components/Icon';

const logger = createLogger('NotificationsScreen');

function HeaderIconButton({
  icon,
  disabled,
  onPress,
}: {
  icon: 'chevron-left' | 'check-circle' | 'x-mark';
  disabled?: boolean;
  onPress: () => void;
}) {
  const iconSize = icon === 'x-mark' ? headerLayout.iconSize - 2 : headerLayout.iconSize;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      disabled={disabled}
      style={{
        width: headerLayout.rightActionSize,
        height: headerLayout.rightActionSize,
        borderRadius: headerLayout.rightActionSize / 2,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={iconSize} color={colors.textPrimary} />
    </Pressable>
  );
}

export function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    initialLoading,
    refreshing,
    hasLoadedOnce,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearOne,
    clearAll,
  } = useNotifications();
  const { invalidate } = useAppData();
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitationView | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce) {
        void refreshNotifications({ background: true });
      }
    }, [hasLoadedOnce, refreshNotifications]),
  );

  const onAcceptComplete = useCallback(async () => {
    invalidateAfterAcceptInvitation(invalidate);
    await refreshNotifications({ background: true });
    setModalVisible(false);
    setSelectedInvitation(null);
  }, [invalidate, refreshNotifications]);

  const onDeclineComplete = useCallback(async () => {
    invalidateAfterDeclineInvitation(invalidate);
    await refreshNotifications({ background: true });
    setModalVisible(false);
    setSelectedInvitation(null);
  }, [invalidate, refreshNotifications]);

  const { accept, decline, processingId } = useInvitationActions({
    onAcceptComplete,
    onDeclineComplete,
  });

  const { unread, earlier } = useMemo(() => {
    const unreadItems = notifications.filter((item) => !item.isRead);
    const earlierItems = notifications.filter((item) => item.isRead);
    return { unread: unreadItems, earlier: earlierItems };
  }, [notifications]);

  const openInvitationModal = useCallback(
    async (notification: Notification) => {
      logger.info('Notification opened', { notificationId: notification.id, type: notification.type });
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      if (notification.type !== 'group_invitation') {
        return;
      }

      const invitationId = notification.data.invitationId;
      if (!invitationId) {
        return;
      }

      const fallback = invitationFallbackFromNotification(notification);
      setSelectedInvitation(null);
      setModalLoading(true);
      setModalVisible(true);

      try {
        const invitation = await getInvitationDetail(invitationId, fallback);
        if (invitation) {
          setSelectedInvitation(invitation);
        } else {
          setSelectedInvitation({
            id: invitationId,
            groupId: fallback.groupId ?? '',
            groupName: fallback.groupName ?? 'this group',
            invitedEmail: fallback.invitedEmail ?? '',
            invitedBy: fallback.invitedBy ?? '',
            inviterName: fallback.inviterName,
            inviterEmail: fallback.inviterEmail,
            createdAt: fallback.createdAt ?? notification.createdAt,
            status: 'cancelled',
          });
        }
        logger.info('Invitation modal opened', { invitationId, groupId: fallback.groupId });
      } catch (error) {
        logger.error('Failed to load invitation detail', error, { invitationId });
        setSelectedInvitation({
          id: invitationId,
          groupId: fallback.groupId ?? '',
          groupName: fallback.groupName ?? 'this group',
          invitedEmail: fallback.invitedEmail ?? '',
          invitedBy: fallback.invitedBy ?? '',
          inviterName: fallback.inviterName,
          inviterEmail: fallback.inviterEmail,
          createdAt: fallback.createdAt ?? notification.createdAt,
          status: 'pending',
        });
      } finally {
        setModalLoading(false);
      }
    },
    [markAsRead],
  );

  const confirmClearAll = useCallback(() => {
    Alert.alert(
      'Clear all notifications?',
      'This will remove all notifications from this list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            void clearAll();
          },
        },
      ],
    );
  }, [clearAll]);

  const handleAccept = useCallback(async () => {
    if (!selectedInvitation || selectedInvitation.status !== 'pending') {
      return;
    }
    const result = await accept(selectedInvitation.id);
    if (result?.groupId) {
      router.push(`/group/${result.groupId}`);
    }
  }, [accept, selectedInvitation]);

  const handleDecline = useCallback(async () => {
    if (!selectedInvitation || selectedInvitation.status !== 'pending') {
      return;
    }
    await decline(selectedInvitation.id);
  }, [decline, selectedInvitation]);

  const showEmpty = hasLoadedOnce && !initialLoading && notifications.length === 0 && !error;
  const showSkeleton = initialLoading && !hasLoadedOnce;

  return (
    <>
      <ScreenLayout
        scroll
        header={
          <View
            style={{
              paddingHorizontal: headerLayout.horizontalPadding,
              paddingTop: headerLayout.topPadding,
              paddingBottom: headerLayout.bottomPadding,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <HeaderIconButton icon="chevron-left" onPress={() => router.back()} />

              <View
                style={{
                  flexDirection: 'row',
                  gap: headerLayout.headerActionsGap,
                  width: headerLayout.headerActionsWidth,
                  justifyContent: 'flex-end',
                }}
              >
                <HeaderIconButton
                  icon="check-circle"
                  disabled={notifications.length === 0 || unreadCount === 0}
                  onPress={() => void markAllAsRead()}
                />
                <HeaderIconButton
                  icon="x-mark"
                  disabled={notifications.length === 0}
                  onPress={confirmClearAll}
                />
              </View>
            </View>

            <Text style={typography.title}>Notifications</Text>
            {unreadCount > 0 ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{unreadCount} unread</Text>
            ) : null}
          </View>
        }
      >
        {showSkeleton ? <NotificationsListSkeleton /> : null}

        {error ? (
          <View style={{ gap: layout.cardGap, alignItems: 'center' }}>
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>
            <PrimaryButton label="Refresh" onPress={() => void refreshNotifications()} />
          </View>
        ) : null}

        {showEmpty ? (
          <EmptyStateCard
            title="No notifications"
            message="You're all caught up. New invitations and group updates will appear here."
            ctaLabel="Refresh"
            onPress={() => void refreshNotifications({ background: true })}
          />
        ) : null}

        {!initialLoading && unread.length > 0 ? (
          <View style={{ gap: layout.cardGap }}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Unread</Text>
            {unread.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onPress={() => void openInvitationModal(notification)}
                onClear={() => void clearOne(notification.id)}
              />
            ))}
          </View>
        ) : null}

        {!initialLoading && earlier.length > 0 ? (
          <View style={{ gap: layout.cardGap }}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Earlier</Text>
            {earlier.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onPress={() => void openInvitationModal(notification)}
                onClear={() => void clearOne(notification.id)}
              />
            ))}
          </View>
        ) : null}

        {refreshing && hasLoadedOnce ? (
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
            Refreshing…
          </Text>
        ) : null}
      </ScreenLayout>

      <InvitationActionModal
        visible={modalVisible}
        invitation={selectedInvitation}
        loading={modalLoading}
        processing={Boolean(selectedInvitation && processingId === selectedInvitation.id)}
        onAccept={() => void handleAccept()}
        onDecline={() => void handleDecline()}
        onClose={() => {
          setModalVisible(false);
          setModalLoading(false);
          setSelectedInvitation(null);
        }}
        onViewGroup={() => {
          if (selectedInvitation?.groupId) {
            router.push(`/group/${selectedInvitation.groupId}`);
          }
          setModalVisible(false);
        }}
      />
    </>
  );
}
