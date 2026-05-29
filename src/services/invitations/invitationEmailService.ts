import { supabase } from '../../lib/supabase';
import { createLogger } from '../../utils/logger';
import type { InvitationEmailResult } from './invitationTypes';

const logger = createLogger('invitationEmailService');

export async function sendInvitationEmail(invitationId: string): Promise<InvitationEmailResult> {
  logger.info('Send invitation email started', { invitationId, table: 'group_invitations' });
  try {
    const { data, error } = await supabase.functions.invoke('send-group-invitation', {
      body: { invitationId },
    });

    if (error) {
      logger.error('Send invitation email failed', error, { invitationId, table: 'group_invitations' });
      return { invitationId, sent: false, error: error.message };
    }

    const payload = data as {
      success?: boolean;
      emailSent?: boolean;
      sent?: boolean;
      error?: string;
      reason?: string;
    } | null;
    const emailWasSent = payload?.emailSent === true || payload?.sent === true;
    if (emailWasSent) {
      logger.info('Send invitation email succeeded', { invitationId, table: 'group_invitations' });
      return { invitationId, sent: true };
    }

    const emailError = payload?.error ?? payload?.reason ?? 'Email could not be sent.';
    logger.warn('Send invitation email returned failure', { invitationId, table: 'group_invitations' });
    return {
      invitationId,
      sent: false,
      error: emailError,
    };
  } catch (error) {
    logger.error('Send invitation email failed', error, { invitationId, table: 'group_invitations' });
    return {
      invitationId,
      sent: false,
      error: error instanceof Error ? error.message : 'Email could not be sent.',
    };
  }
}

/** @deprecated Use sendInvitationEmail */
export async function sendGroupInvitationEmail(invitationId: string, _groupId: string): Promise<void> {
  await sendInvitationEmail(invitationId);
}
