import { Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { UserAvatar } from '../common';
import { HeaderRightActionSlot } from '../common/HeaderRightActionSlot';
import { NotificationHeaderButton } from '../common/NotificationHeaderButton';
import { headerLayout } from '../common/headerLayout';

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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          minHeight: headerLayout.rightActionSize,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 12,
            minHeight: headerLayout.rightActionSize,
          }}
        >
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

          <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
            <Text style={[typography.title, { fontSize: 21, lineHeight: 27 }]} numberOfLines={1}>
              {loading ? 'Hi' : greeting}
            </Text>
            <Text style={[typography.subtitle, { marginTop: 4, lineHeight: 20 }]} numberOfLines={2}>
              Here's your spending overview.
            </Text>
          </View>
        </View>

        <HeaderRightActionSlot>
          <NotificationHeaderButton unreadCount={unreadCount} onPress={onNotificationPress} />
        </HeaderRightActionSlot>
      </View>
    </View>
  );
}
