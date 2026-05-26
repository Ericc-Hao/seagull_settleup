import { useCallback, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import { createGroupWithInvitations } from '../services/groupService';
import { ensureProfileExists } from '../services/profileService';
import type { CreateGroupWithInvitationsResult } from '../types/inputs';
import type { GroupType } from '../types/models';
import { formatDateForSupabase, isEndDateValid, parseSupabaseDate } from '../utils/date';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { invalidateAfterCreateGroup } from '../utils/mutationInvalidation';
import {
  hasDuplicateEmail,
  isValidEmail,
  maskEmail,
  normalizeEmail,
} from '../utils/validation';

const logger = createLogger('useCreateGroup');

export function useCreateGroup() {
  const { invalidate, refreshNotifications } = useAppData();
  const today = formatDateForSupabase(new Date());

  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('Trip');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [emailValue, setEmailValue] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [dateError, setDateError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const validateDates = useCallback((start: string, end: string): string | undefined => {
    if (!start) {
      return 'Start date is required.';
    }
    if (end && !isEndDateValid(start, end)) {
      return 'End date cannot be before start date.';
    }
    return undefined;
  }, []);

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
      setEmailError('This email has already been invited.');
      return;
    }

    const profile = await ensureProfileExists();
    const ownerEmail = profile?.email ? normalizeEmail(profile.email) : null;
    if (ownerEmail && normalized === ownerEmail) {
      setEmailError('Your account is already added as the group owner.');
      return;
    }

    setInvitedEmails((current) => [...current, normalized]);
    setEmailValue('');
    logger.info('Invited email added', { email: maskEmail(normalized), invitedCount: invitedEmails.length + 1 });
  }, [emailValue, invitedEmails]);

  const removeEmail = useCallback((email: string) => {
    setInvitedEmails((current) => current.filter((item) => item !== email));
    logger.info('Invited email removed', { email: maskEmail(email) });
  }, []);

  const submit = useCallback(async (): Promise<CreateGroupWithInvitationsResult> => {
    if (submitting) {
      throw new Error('Group creation is already in progress.');
    }

    setSubmitError(undefined);
    setNameError(undefined);
    setDateError(undefined);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Group name is required.');
      throw new Error('Group name is required.');
    }
    if (!groupType) {
      throw new Error('Group type is required.');
    }

    const nextDateError = validateDates(startDate, endDate);
    if (nextDateError) {
      setDateError(nextDateError);
      throw new Error(nextDateError);
    }

    for (const email of invitedEmails) {
      if (!isValidEmail(email)) {
        throw new Error(`Invalid invited email: ${email}`);
      }
    }

    setSubmitting(true);
    logger.info('Create group submit started', { invitedCount: invitedEmails.length, groupType });
    try {
      const result = await createGroupWithInvitations({
        name: trimmedName,
        type: groupType,
        startDate,
        endDate: endDate || null,
        invitedEmails,
      });
      invalidateAfterCreateGroup(invalidate);
      void refreshNotifications();
      logger.info('Create group submit succeeded', { groupId: result.group.id });
      return result;
    } catch (error) {
      logger.error('Create group submit failed', error, { invitedCount: invitedEmails.length });
      const message = toUserFriendlyError(error, 'Unable to create group. Please try again.');
      setSubmitError(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [endDate, groupType, invitedEmails, invalidate, name, refreshNotifications, startDate, submitting, validateDates]);

  const handleStartDateChange = useCallback(
    (value: string) => {
      setStartDate(value);
      setDateError(validateDates(value, endDate));
      if (endDate && parseSupabaseDate(endDate).getTime() < parseSupabaseDate(value).getTime()) {
        setEndDate('');
      }
    },
    [endDate, validateDates],
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      setEndDate(value);
      setDateError(validateDates(startDate, value));
    },
    [startDate, validateDates],
  );

  const clearEndDate = useCallback(() => {
    setEndDate('');
    setDateError(validateDates(startDate, ''));
  }, [startDate, validateDates]);

  return {
    title: UI_COPY.createGroupTitle,
    subtitle: UI_COPY.createGroupSubtitle,
    ctaLabel: submitting ? 'Creating Group...' : UI_COPY.createGroupCta,
    name,
    setName,
    nameError,
    groupType,
    setGroupType,
    startDate,
    endDate,
    setStartDate: handleStartDateChange,
    setEndDate: handleEndDateChange,
    clearEndDate,
    endDateMinimum: startDate ? parseSupabaseDate(startDate) : undefined,
    dateError,
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
  };
}
