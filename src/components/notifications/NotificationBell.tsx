import { Pressable, Text, View } from 'react-native';

import { colors } from '../../theme';
import { headerLayout } from '../common/headerLayout';
import { Icon } from '../Icon';

export function NotificationBell({
  unreadCount,
  onPress,
}: {
  unreadCount: number;
  onPress?: () => void;
}) {
  const showBadge = unreadCount > 0;
  const badgeLabel = unreadCount > 9 ? '9+' : `${unreadCount}`;

  return (
    <View
      style={{
        width: headerLayout.rightActionSize,
        height: headerLayout.rightActionSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={{
          width: headerLayout.rightActionSize,
          height: headerLayout.rightActionSize,
          borderRadius: headerLayout.rightActionSize / 2,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="bell" size={headerLayout.iconSize} color={colors.textPrimary} strokeWidth={1.5} />
        {showBadge ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: headerLayout.badgeTop,
              right: headerLayout.badgeRight,
              minWidth: headerLayout.badgeMinWidth,
              height: headerLayout.badgeHeight,
              borderRadius: headerLayout.badgeHeight / 2,
              paddingHorizontal: unreadCount > 9 ? 3 : 0,
              backgroundColor: colors.danger,
              borderWidth: 1.5,
              borderColor: colors.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.white, fontSize: 9, fontWeight: '700', lineHeight: 11 }}>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
