import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { layout, typography } from '../../theme';
import { NotificationBell } from '../notifications/NotificationBell';
import { headerLayout } from './headerLayout';

function RightActionSlot({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        width: headerLayout.rightActionSize,
        height: headerLayout.rightActionSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

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
      <NotificationBell unreadCount={notificationUnreadCount} onPress={onPressNotification} />
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

        <RightActionSlot>{resolvedRight}</RightActionSlot>
      </View>
    </View>
  );
}
