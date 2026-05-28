import { NotificationHeaderButton } from '../common/NotificationHeaderButton';

/** @deprecated Prefer NotificationHeaderButton — kept for existing imports. */
export function NotificationBell({
  unreadCount,
  onPress,
}: {
  unreadCount: number;
  onPress?: () => void;
}) {
  return <NotificationHeaderButton unreadCount={unreadCount} onPress={onPress} />;
}
