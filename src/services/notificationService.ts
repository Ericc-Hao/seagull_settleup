import { mapNotification } from '../lib/mappers';
import {
  NOTIFICATION_COLUMNS,
  NOTIFICATION_LIST_LIMIT,
} from '../lib/queryColumns';
import { supabase } from '../lib/supabase';
import type { Notification, NotificationData, NotificationType } from '../types/models';
import { isRecoverableAuthSessionError } from '../utils/authErrors';
import { isoNow } from '../utils/date';
import {
  formatInvitationNotificationBody,
  formatInviterNameOrEmail,
  GROUP_INVITATION_NOTIFICATION_TITLE,
  quoteGroupName,
} from '../utils/invitationCopy';
import { createLogger } from '../utils/logger';

const logger = createLogger('notificationService');

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: NotificationData;
  groupId?: string;
}

export interface EnsureInvitationNotificationInput {
  invitationId: string;
  userId: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  inviterName?: string;
  inviterEmail?: string;
  invitedEmail?: string;
  createdAt?: string;
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error('You must be logged in.');
  }
  return data.user.id;
}

async function withAuthRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  alreadyRetried = false,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (alreadyRetried || !isRecoverableAuthSessionError(error)) {
      throw error;
    }

    logger.warn(`${operationName} failed due to JWT timing error`, {
      reason: 'recoverable_session_error',
      table: 'notifications',
    });
    logger.info(`${operationName} retry after refresh started`, { table: 'notifications' });

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw refreshError;
    }

    logger.info(`${operationName} retry after refresh succeeded`, { table: 'notifications' });
    return withAuthRetry(operation, operationName, true);
  }
}

function normalizeGroupInvitationNotification(notification: Notification): Notification {
  if (notification.type !== 'group_invitation') {
    return notification;
  }

  let title = notification.title?.trim() ?? '';
  let body = notification.body?.trim();

  if (title.toLowerCase().includes('invited you to join') && body === GROUP_INVITATION_NOTIFICATION_TITLE) {
    title = GROUP_INVITATION_NOTIFICATION_TITLE;
  } else if (title === 'Group invatition') {
    title = GROUP_INVITATION_NOTIFICATION_TITLE;
  } else if (!title || title.toLowerCase() === 'group invatition') {
    title = GROUP_INVITATION_NOTIFICATION_TITLE;
  }

  if (!body && notification.data.groupName) {
    body = formatInvitationNotificationBody({
      inviterName: notification.data.inviterName,
      inviterEmail: notification.data.inviterEmail,
      groupName: notification.data.groupName,
    });
  }

  return {
    ...notification,
    title,
    body,
  };
}

export async function getNotifications(): Promise<Notification[]> {
  logger.info('Fetch notifications started', { table: 'notifications' });
  try {
    return await withAuthRetry(async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS)
        .eq('user_id', userId)
        .is('cleared_at', null)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATION_LIST_LIMIT);

      if (error) {
        throw error;
      }

      const notifications = (data ?? []).map(mapNotification).map(normalizeGroupInvitationNotification);
      logger.info('Fetch notifications succeeded', { count: notifications.length, table: 'notifications' });
      return notifications;
    }, 'Fetch notifications');
  } catch (error) {
    if (isRecoverableAuthSessionError(error)) {
      logger.warn('Fetch notifications failed due to JWT timing error', {
        reason: 'recoverable_session_error',
        table: 'notifications',
      });
    } else {
      logger.error('Fetch notifications failed', error, { table: 'notifications' });
    }
    throw error;
  }
}

export async function getUnreadNotifications(): Promise<Notification[]> {
  logger.info('Fetch unread notifications started', { table: 'notifications' });
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('cleared_at', null)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATION_LIST_LIMIT);

    if (error) {
      throw error;
    }

    const notifications = (data ?? []).map(mapNotification).map(normalizeGroupInvitationNotification);
    logger.info('Fetch unread notifications succeeded', { count: notifications.length, table: 'notifications' });
    return notifications;
  } catch (error) {
    logger.error('Fetch unread notifications failed', error, { table: 'notifications' });
    throw error;
  }
}

export async function getUnreadCount(): Promise<number> {
  logger.info('Fetch unread count started', { table: 'notifications' });
  try {
    return await withAuthRetry(async () => {
      const userId = await getCurrentUserId();
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .is('cleared_at', null);

      if (error) {
        throw error;
      }

      const unreadCount = count ?? 0;
      logger.info('Fetch unread count succeeded', { unreadCount, table: 'notifications' });
      return unreadCount;
    }, 'Fetch unread count');
  } catch (error) {
    if (isRecoverableAuthSessionError(error)) {
      logger.warn('Fetch unread count failed due to JWT timing error', {
        reason: 'recoverable_session_error',
        table: 'notifications',
      });
    } else {
      logger.error('Fetch unread count failed', error, { table: 'notifications' });
    }
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  logger.info('Mark notification as read started', { notificationId, table: 'notifications' });
  try {
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: isoNow() })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    logger.info('Mark notification as read succeeded', { notificationId, table: 'notifications' });
  } catch (error) {
    logger.error('Mark notification as read failed', error, { notificationId, table: 'notifications' });
    throw error;
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  logger.info('Mark all notifications as read started', { table: 'notifications' });
  try {
    const userId = await getCurrentUserId();
    const now = isoNow();
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('cleared_at', null);

    if (error) {
      throw error;
    }

    logger.info('Mark all notifications as read succeeded', { table: 'notifications' });
  } catch (error) {
    logger.error('Mark all notifications as read failed', error, { table: 'notifications' });
    throw error;
  }
}

export async function clearNotification(notificationId: string): Promise<void> {
  logger.info('Clear notification started', { notificationId, table: 'notifications' });
  try {
    const userId = await getCurrentUserId();
    const now = isoNow();
    const { error } = await supabase
      .from('notifications')
      .update({ cleared_at: now, is_read: true, read_at: now })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .is('cleared_at', null);

    if (error) {
      throw error;
    }

    logger.info('Clear notification succeeded', { notificationId, table: 'notifications' });
  } catch (error) {
    logger.error('Clear notification failed', error, { notificationId, table: 'notifications' });
    throw error;
  }
}

export async function clearAllNotifications(): Promise<number> {
  logger.info('Clear all notifications started', { table: 'notifications' });
  try {
    const userId = await getCurrentUserId();
    const now = isoNow();
    const { data, error } = await supabase
      .from('notifications')
      .update({ cleared_at: now, is_read: true, read_at: now })
      .eq('user_id', userId)
      .is('cleared_at', null)
      .select('id');

    if (error) {
      throw error;
    }

    const clearedCount = data?.length ?? 0;
    logger.info('Clear all notifications succeeded', { clearedCount, table: 'notifications' });
    return clearedCount;
  } catch (error) {
    logger.error('Clear all notifications failed', error, { table: 'notifications' });
    throw error;
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  logger.info('Create notification started', { type: input.type, table: 'notifications' });
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? {},
        group_id: input.groupId ?? input.data?.groupId ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    const notification = mapNotification(data);
    logger.info('Create notification succeeded', {
      notificationId: notification.id,
      type: input.type,
      table: 'notifications',
    });
    return notification;
  } catch (error) {
    logger.error('Create notification failed', error, { type: input.type, table: 'notifications' });
    throw error;
  }
}

export async function ensureInvitationNotification(
  input: EnsureInvitationNotificationInput,
): Promise<Notification | null> {
  logger.info('Ensure invitation notification started', {
    invitationId: input.invitationId,
    table: 'notifications',
  });
  try {
    const { data: existing, error: existingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', input.userId)
      .eq('type', 'group_invitation')
      .is('cleared_at', null)
      .contains('data', { invitationId: input.invitationId })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      logger.info('Invitation notification skipped duplicate', {
        invitationId: input.invitationId,
        table: 'notifications',
      });
      return null;
    }

    const body = formatInvitationNotificationBody({
      inviterName: input.inviterName,
      inviterEmail: input.inviterEmail,
      groupName: input.groupName,
    });
    logger.info('Invitation notification content created', {
      invitationId: input.invitationId,
      groupId: input.groupId,
      table: 'notifications',
    });
    const notification = await createNotification({
      userId: input.userId,
      type: 'group_invitation',
      title: GROUP_INVITATION_NOTIFICATION_TITLE,
      body,
      groupId: input.groupId,
      data: {
        invitationId: input.invitationId,
        groupId: input.groupId,
        groupName: input.groupName,
        invitedBy: input.invitedBy,
        inviterName: input.inviterName,
        inviterEmail: input.inviterEmail,
        invitedEmail: input.invitedEmail,
        createdAt: input.createdAt,
      },
    });

    logger.info('Invitation notification created', {
      invitationId: input.invitationId,
      notificationId: notification.id,
      table: 'notifications',
    });
    return notification;
  } catch (error) {
    logger.error('Ensure invitation notification failed', error, {
      invitationId: input.invitationId,
      table: 'notifications',
    });
    throw error;
  }
}

export async function markInvitationNotificationsAsRead(invitationId: string): Promise<void> {
  logger.info('Mark invitation notifications as read started', { invitationId, table: 'notifications' });
  try {
    const userId = await getCurrentUserId();
    const now = isoNow();
    const { data, error } = await supabase
      .from('notifications')
      .select('id, data')
      .eq('user_id', userId)
      .eq('type', 'group_invitation')
      .is('cleared_at', null)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    const matchingIds = (data ?? [])
      .filter((row) => {
        const payload = row.data as Record<string, unknown> | null;
        return payload?.invitationId === invitationId;
      })
      .map((row) => row.id);

    if (matchingIds.length === 0) {
      return;
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .in('id', matchingIds)
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    logger.info('Mark invitation notifications as read succeeded', { invitationId, table: 'notifications' });
  } catch (error) {
    logger.error('Mark invitation notifications as read failed', error, {
      invitationId,
      table: 'notifications',
    });
    throw error;
  }
}

export async function createInvitationResponseNotification(input: {
  ownerUserId: string;
  type: 'invitation_accepted' | 'invitation_declined';
  responderName?: string;
  responderEmail?: string;
  groupName: string;
  groupId: string;
  invitationId: string;
}): Promise<void> {
  const label = formatInviterNameOrEmail(input.responderName, input.responderEmail);
  const accepted = input.type === 'invitation_accepted';
  await createNotification({
    userId: input.ownerUserId,
    type: input.type,
    title: accepted ? 'Invitation accepted' : 'Invitation declined',
    body: accepted
      ? `${label} accepted your invitation to ${quoteGroupName(input.groupName)}.`
      : `${label} declined your invitation to ${quoteGroupName(input.groupName)}.`,
    groupId: input.groupId,
    data: {
      invitationId: input.invitationId,
      groupId: input.groupId,
      groupName: input.groupName,
    },
  });
}
