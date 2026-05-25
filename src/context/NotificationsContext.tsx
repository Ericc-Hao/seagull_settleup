import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAppData } from './AppDataContext';
import {
  clearAllNotifications,
  clearNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';
import type { Notification } from '../types/models';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('NotificationsContext');

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  initialLoading: boolean;
  refreshing: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  refreshNotifications: (options?: { background?: boolean }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearOne: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { version } = useAppData();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchGeneration = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const refreshNotifications = useCallback(async (options?: { background?: boolean }) => {
    const generation = ++fetchGeneration.current;
    const background = options?.background ?? hasLoadedOnceRef.current;

    if (!background) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    logger.info('Notifications fetch started', { background });

    try {
      const [items, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      if (generation !== fetchGeneration.current) {
        return;
      }

      setNotifications(items);
      setUnreadCount(count);
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);

      if (items.length === 0) {
        logger.info('Notifications empty result');
      }
      logger.info('Notifications fetch succeeded', { count: items.length, unreadCount: count });
    } catch (err) {
      if (generation !== fetchGeneration.current) {
        return;
      }
      logger.error('Notifications fetch failed', err);
      setError(toUserFriendlyError(err, 'Unable to load notifications.'));
    } finally {
      if (generation === fetchGeneration.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshNotifications({ background: hasLoadedOnceRef.current });
  }, [version, refreshNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    logger.info('Mark as read started', { notificationId });
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      logger.info('Mark as read succeeded', { notificationId });
    } catch (err) {
      logger.error('Mark as read failed', err, { notificationId });
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    logger.info('Mark all as read started');
    try {
      await markAllNotificationsAsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: now })));
      setUnreadCount(0);
      logger.info('Mark all as read succeeded');
    } catch (err) {
      logger.error('Mark all as read failed', err);
      throw err;
    }
  }, []);

  const clearOne = useCallback(async (notificationId: string) => {
    logger.info('Clear notification started', { notificationId });
    try {
      await clearNotification(notificationId);
      setNotifications((current) => {
        const target = current.find((item) => item.id === notificationId);
        if (target && !target.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return current.filter((item) => item.id !== notificationId);
      });
      logger.info('Clear notification succeeded', { notificationId });
    } catch (err) {
      logger.error('Clear notification failed', err, { notificationId });
      throw err;
    }
  }, []);

  const clearAll = useCallback(async () => {
    logger.info('Clear all notifications started');
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      logger.info('Clear all notifications succeeded');
    } catch (err) {
      logger.error('Clear all notifications failed', err);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading: initialLoading || refreshing,
      initialLoading,
      refreshing,
      hasLoadedOnce,
      error,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      clearOne,
      clearAll,
    }),
    [
      clearAll,
      clearOne,
      error,
      hasLoadedOnce,
      initialLoading,
      markAllAsRead,
      markAsRead,
      notifications,
      refreshNotifications,
      refreshing,
      unreadCount,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue & { refetch: () => Promise<void> } {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return {
    ...context,
    refetch: () => context.refreshNotifications({ background: context.hasLoadedOnce }),
  };
}
