import { PageHeader } from '../common/PageHeader';

type TabPageHeaderProps = {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  onNotificationPress?: () => void;
};

/** Tab screen header with stable notification bell slot. */
export function TabPageHeader({ title, subtitle, unreadCount = 0, onNotificationPress }: TabPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      showNotificationBell
      notificationUnreadCount={unreadCount}
      onPressNotification={onNotificationPress}
    />
  );
}
