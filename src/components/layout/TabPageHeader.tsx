import { Pressable, View } from 'react-native';

import { colors } from '../../theme';
import { Icon } from '../Icon';
import { PageHeader } from '../common/PageHeader';
import { HeaderRightActionSlot } from '../common/HeaderRightActionSlot';
import { NotificationHeaderButton } from '../common/NotificationHeaderButton';
import { headerLayout } from '../common/headerLayout';

type TabPageHeaderProps = {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onCreateGroupPress?: () => void;
};

function HeaderIconButton({ icon, onPress }: { icon: 'plus'; onPress?: () => void }) {
  return (
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
      <Icon name={icon} size={headerLayout.iconSize} color={colors.textPrimary} strokeWidth={1.5} />
    </Pressable>
  );
}

/** Tab screen header with stable notification bell slot. */
export function TabPageHeader({
  title,
  subtitle,
  unreadCount = 0,
  onNotificationPress,
  onCreateGroupPress,
}: TabPageHeaderProps) {
  const rightAction = onCreateGroupPress ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: headerLayout.headerActionsGap }}>
      <HeaderIconButton icon="plus" onPress={onCreateGroupPress} />
      <NotificationHeaderButton unreadCount={unreadCount} onPress={onNotificationPress} />
    </View>
  ) : undefined;

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      rightAction={rightAction}
      showNotificationBell={!onCreateGroupPress}
      notificationUnreadCount={unreadCount}
      onPressNotification={onNotificationPress}
    />
  );
}
