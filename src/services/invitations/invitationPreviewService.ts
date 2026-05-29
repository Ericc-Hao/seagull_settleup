import { supabase } from '../../lib/supabase';
import type { InvitationPreviewView } from '../../types/views';
import { createLogger } from '../../utils/logger';

const logger = createLogger('invitationPreviewService');

export async function getInvitationPreviewByToken(token: string): Promise<InvitationPreviewView | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return null;
  }

  logger.info('Get invitation preview started', { hasToken: Boolean(trimmedToken) });

  try {
    const { data, error } = await supabase.functions.invoke('get-invitation-preview', {
      body: { token: trimmedToken },
    });

    if (error) {
      throw error;
    }

    const payload = data as {
      success?: boolean;
      error?: string;
      invitation?: {
        invitationId: string;
        token?: string;
        groupId?: string;
        groupName?: string;
        invitedEmail?: string;
        inviterName?: string;
        inviterEmail?: string;
        status?: InvitationPreviewView['status'];
        expiresAt?: string | null;
        isValid?: boolean;
        inviteeHasAccount?: boolean;
      };
      preview?: {
        invitationId: string;
        token?: string;
        groupId?: string;
        groupName?: string;
        invitedEmail?: string;
        inviterName?: string;
        inviterEmail?: string;
        status?: InvitationPreviewView['status'];
        expiresAt?: string | null;
        isValid?: boolean;
        inviteeHasAccount?: boolean;
      };
    } | null;

    if (!payload?.success) {
      if (payload?.error === 'Invitation not found') {
        logger.info('Get invitation preview succeeded', { hasInvitation: false });
        return null;
      }
      throw new Error(payload?.error ?? 'Unable to load invitation preview.');
    }

    const invitation = payload.invitation ?? payload.preview;
    if (!invitation) {
      logger.info('Get invitation preview succeeded', { hasInvitation: false });
      return null;
    }

    const preview: InvitationPreviewView = {
      invitationId: invitation.invitationId,
      token: invitation.token ?? trimmedToken,
      groupId: invitation.groupId,
      groupName: invitation.groupName?.trim() || 'this group',
      inviterName: invitation.inviterName?.trim() || undefined,
      inviterEmail: invitation.inviterEmail?.trim() || undefined,
      invitedEmail: invitation.invitedEmail?.trim() || '',
      status: invitation.status ?? 'cancelled',
      expiresAt: invitation.expiresAt ?? null,
      isValid: Boolean(invitation.isValid),
      inviteeHasAccount: Boolean(invitation.inviteeHasAccount),
    };

    logger.info('Get invitation preview succeeded', {
      hasInvitation: true,
      status: preview.status,
      invitationId: preview.invitationId,
      inviteeHasAccount: preview.inviteeHasAccount,
    });
    return preview;
  } catch (error) {
    logger.error('Get invitation preview failed', error, { table: 'group_invitations' });
    throw error;
  }
}
