import { Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { UserAvatar } from '../common';
import { headerLayout } from '../common/headerLayout';
import { NotificationBell } from '../notifications/NotificationBell';

function displayLabel(displayName?: string, email?: string): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) {
    return trimmedName;
  }
  const emailPrefix = email?.split('@')[0]?.trim();
  return emailPrefix || '';
}

export function HomeHeader({
  displayName,
  email,
  avatarUrl,
  loading,
  unreadCount = 0,
  onNotificationPress,
}: {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  loading?: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
}) {
  const name = displayLabel(displayName, email);
  const greeting = name ? `Hi, ${name}` : 'Hi';

  return (
    <View
      style={{
        paddingHorizontal: headerLayout.horizontalPadding,
        paddingTop: headerLayout.topPadding,
        paddingBottom: headerLayout.bottomPadding,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: headerLayout.rightActionSize }}>
        {loading ? (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              backgroundColor: colors.tertiary,
              opacity: 0.65,
            }}
          />
        ) : (
          <UserAvatar avatarUrl={avatarUrl} displayName={displayName} email={email} size="medium" />
        )}

        <View style={{ flex: 1, marginLeft: 14, paddingRight: 12 }}>
          <Text style={[typography.title, { fontSize: 21, lineHeight: 27 }]} numberOfLines={1}>
            {loading ? 'Hi' : greeting}
          </Text>
          <Text style={[typography.subtitle, { marginTop: 4, lineHeight: 20 }]} numberOfLines={2}>
            Here's your spending overview.
          </Text>
        </View>

        <NotificationBell unreadCount={unreadCount} onPress={onNotificationPress} />
      </View>
    </View>
  );
}
