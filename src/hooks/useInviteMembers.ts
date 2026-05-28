import { useCallback, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { ensureProfileExists } from '../services/profileService';
import { hasDuplicateInviteEmailInGroup, inviteMoreMembers } from '../services/invitationService';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { INVITE_EMAIL_ERRORS, resolveFinalInviteEmails } from '../utils/inviteEmailSubmit';
import { invalidateAfterInviteMember } from '../utils/mutationInvalidation';
import {
  hasDuplicateEmail,
  isValidEmail,
  maskEmail,
  normalizeEmail,
} from '../utils/validation';

const logger = createLogger('useInviteMembers');

export function useInviteMembers(groupId: string) {
  const { invalidate, refreshNotifications } = useAppData();
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addEmail = useCallback(async () => {
    setEmailError(undefined);
    const normalized = normalizeEmail(emailValue);

    if (!normalized) {
      setEmailError('Enter an email address.');
      return;
    }
    if (!isValidEmail(normalized)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (hasDuplicateEmail(invitedEmails, normalized)) {
      setEmailError('This email has already been added.');
      return;
    }

    const profile = await ensureProfileExists();
    const ownerEmail = profile?.email ? normalizeEmail(profile.email) : null;
    if (ownerEmail && normalized === ownerEmail) {
      setEmailError('You are already a member of this group.');
      return;
    }

    setInvitedEmails((current) => [...current, normalized]);
    setEmailValue('');
    logger.info('Invite email added', { email: maskEmail(normalized), groupId });
  }, [emailValue, groupId, invitedEmails]);

  const removeEmail = useCallback((email: string) => {
    setInvitedEmails((current) => current.filter((item) => item !== email));
    logger.info('Invite email removed', { email: maskEmail(email), groupId });
  }, [groupId]);

  const submit = useCallback(async () => {
    if (submitting) {
      return;
    }

    setSubmitError(undefined);
    setEmailError(undefined);

    const resolved = resolveFinalInviteEmails(invitedEmails, emailValue, { requireAtLeastOne: true });
    if (!resolved.ok) {
      setEmailError(resolved.error);
      throw new Error(resolved.error);
    }

    const profile = await ensureProfileExists();
    const ownerEmail = profile?.email ? normalizeEmail(profile.email) : null;
    if (ownerEmail && resolved.finalEmails.some((email) => email === ownerEmail)) {
      setEmailError('You are already a member of this group.');
      throw new Error('You are already a member of this group.');
    }

    if (groupId && (await hasDuplicateInviteEmailInGroup(groupId, resolved.finalEmails))) {
      setEmailError(INVITE_EMAIL_ERRORS.duplicate);
      throw new Error(INVITE_EMAIL_ERRORS.duplicate);
    }

    setSubmitting(true);
    setWarnings([]);
    logger.info('Invite more members submit started', { groupId, emailCount: resolved.finalEmails.length });

    try {
      const result = await inviteMoreMembers(groupId, resolved.finalEmails);
      invalidateAfterInviteMember(invalidate, groupId);
      void refreshNotifications();
      setWarnings(result.warnings);
      setInvitedEmails([]);
      setEmailValue('');
      setEmailError(undefined);
      logger.info('Invite more members submit succeeded', { groupId, invitationCount: result.invitations.length });
      return result;
    } catch (error) {
      logger.error('Invite more members submit failed', error, { groupId });
      const message = toUserFriendlyError(error, 'Unable to send invitations.');
      setSubmitError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [emailValue, groupId, invitedEmails, invalidate, refreshNotifications, submitting]);

  return {
    invitedEmails,
    emailValue,
    setEmailValue: (value: string) => {
      setEmailValue(value);
      if (emailError) {
        setEmailError(undefined);
      }
    },
    emailError,
    addEmail,
    removeEmail,
    submit,
    submitting,
    submitError,
    warnings,
    ctaLabel: submitting ? 'Sending Invitations...' : 'Send Invitations',
  };
}
