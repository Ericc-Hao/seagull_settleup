import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import type { Notification, NotificationType } from '../../types/models';
import { formatRelativeTime } from '../../utils/date';
import { formatInvitationNotificationBody } from '../../utils/invitationCopy';
import { Icon, type IconName } from '../Icon';

function notificationIcon(type: NotificationType): IconName {
  switch (type) {
    case 'group_invitation':
      return 'user-group';
    case 'invitation_accepted':
    case 'invitation_declined':
      return 'envelope';
    case 'expense_update':
      return 'document-plus';
    case 'settlement_update':
      return 'banknotes';
    case 'group_update':
      return 'users';
    default:
      return 'bell';
  }
}

function notificationBody(notification: Notification): string {
  if (notification.type === 'group_invitation') {
    return (
      notification.body ??
      formatInvitationNotificationBody({
        inviterName: notification.data.inviterName,
        inviterEmail: notification.data.inviterEmail,
        groupName: notification.data.groupName ?? 'Group',
      })
    );
  }
  return notification.body ?? '';
}

export function NotificationRow({
  notification,
  onPress,
  onClear,
}: {
  notification: Notification;
  onPress: () => void;
  onClear?: () => void;
}) {
  const icon = notificationIcon(notification.type);
  const body = notificationBody(notification);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: layout.cardPadding,
        backgroundColor: pressed ? colors.tertiary : colors.white,
        borderRadius: layout.cardRadius,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={colors.textPrimary} strokeWidth={1.5} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[typography.bodyMedium, { flex: 1 }]} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.isRead ? (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.primary,
              }}
            />
          ) : null}
        </View>
        {body ? (
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]} numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        {notification.type === 'group_invitation' && notification.data.groupName ? (
          <Text style={[typography.caption, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1}>
            Group: {notification.data.groupName}
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Icon name="x-mark" size={16} color={colors.textTertiary} />
          </Pressable>
        ) : null}
        <Icon name="chevron-right" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}
