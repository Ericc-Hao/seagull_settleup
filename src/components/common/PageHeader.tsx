import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { layout, typography } from '../../theme';
import { HeaderRightActionSlot } from './HeaderRightActionSlot';
import { NotificationHeaderButton } from './NotificationHeaderButton';
import { headerLayout } from './headerLayout';

export function PageHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  showNotificationBell = false,
  notificationUnreadCount = 0,
  onPressNotification,
}: {
  title?: string;
  subtitle?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  showNotificationBell?: boolean;
  notificationUnreadCount?: number;
  onPressNotification?: () => void;
}) {
  const resolvedRight =
    rightAction ??
    (showNotificationBell ? (
      <NotificationHeaderButton unreadCount={notificationUnreadCount} onPress={onPressNotification} />
    ) : (
      <View style={{ width: headerLayout.rightActionSize, height: headerLayout.rightActionSize }} />
    ));

  return (
    <View
      style={{
        paddingHorizontal: headerLayout.horizontalPadding,
        paddingTop: headerLayout.topPadding,
        paddingBottom: headerLayout.bottomPadding,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          minHeight: headerLayout.rightActionSize,
        }}
      >
        {leftAction ? (
          <View style={{ marginRight: layout.cardGap }}>{leftAction}</View>
        ) : null}

        <View style={{ flex: 1, paddingRight: 12, justifyContent: 'center', minHeight: headerLayout.rightActionSize }}>
          {title ? <Text style={typography.title}>{title}</Text> : null}
          {subtitle ? (
            <Text style={[typography.subtitle, { marginTop: title ? 4 : 0, lineHeight: 20 }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <HeaderRightActionSlot wide={Boolean(rightAction)}>{resolvedRight}</HeaderRightActionSlot>
      </View>
    </View>
  );
}
