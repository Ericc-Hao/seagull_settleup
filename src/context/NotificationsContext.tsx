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

import { registerNotificationsRefresher } from './appDataBridge';
import { useAppData } from './AppDataContext';
import { useAuth } from './AuthContext';
import {
  clearAllNotifications,
  clearNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';
import type { Notification } from '../types/models';
import { isRecoverableAuthSessionError } from '../utils/authErrors';
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
  clearingAll: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function clearNotificationState(
  setNotifications: (value: Notification[]) => void,
  setUnreadCount: (value: number) => void,
  setInitialLoading: (value: boolean) => void,
): void {
  setNotifications([]);
  setUnreadCount(0);
  setInitialLoading(false);
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { authInitialized, session, signOut } = useAuth();
  const { invalidate } = useAppData();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchGeneration = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const refreshNotifications = useCallback(async (options?: { background?: boolean }) => {
    if (!authInitialized) {
      logger.info('Notifications fetch skipped because auth not initialized');
      return;
    }

    if (!userId) {
      logger.info('Notifications fetch skipped because no session');
      clearNotificationState(setNotifications, setUnreadCount, setInitialLoading);
      return;
    }

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

      if (isRecoverableAuthSessionError(err)) {
        logger.warn('Notifications fetch failed due to recoverable session error', {
          reason: 'recoverable_session_error',
        });
        await signOut({ local: true, reason: 'recoverable_session_error' });
        clearNotificationState(setNotifications, setUnreadCount, setInitialLoading);
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
  }, [authInitialized, signOut, userId]);

  useEffect(() => {
    registerNotificationsRefresher(refreshNotifications);
    return () => registerNotificationsRefresher(null);
  }, [refreshNotifications]);

  useEffect(() => {
    if (!authInitialized) {
      logger.debug('Notifications fetch skipped because auth not initialized');
      return;
    }

    if (!userId) {
      logger.info('Notifications fetch skipped because no session');
      clearNotificationState(setNotifications, setUnreadCount, setInitialLoading);
      return;
    }

    void refreshNotifications({ background: hasLoadedOnceRef.current });
  }, [authInitialized, refreshNotifications, userId]);

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
    fetchGeneration.current += 1;
    setClearingAll(true);
    setError(null);
    try {
      const clearedCount = await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setInitialLoading(false);
      setRefreshing(false);
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
      invalidate('notifications');
      logger.info('Clear all notifications succeeded', { clearedCount });
    } catch (err) {
      logger.error('Clear all notifications failed', err);
      setError(toUserFriendlyError(err, 'Unable to clear notifications.'));
      throw err;
    } finally {
      setClearingAll(false);
    }
  }, [invalidate]);

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
      clearingAll,
    }),
    [
      clearAll,
      clearOne,
      clearingAll,
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

  const refetch = useCallback(
    () => context.refreshNotifications({ background: context.hasLoadedOnce }),
    [context],
  );

  return {
    ...context,
    refetch,
  };
}
