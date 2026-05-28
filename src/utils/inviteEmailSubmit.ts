import { hasDuplicateEmail, isValidEmail, normalizeEmail } from './validation';

export const INVITE_EMAIL_ERRORS = {
  empty: 'Please enter at least one email address.',
  invalid: 'Please enter a valid email address.',
  duplicate: 'This email has already been added.',
} as const;

export type ResolveFinalInviteEmailsResult =
  | { ok: true; finalEmails: string[] }
  | { ok: false; error: string };

/**
 * Builds the email list to submit, optionally including the current input value
 * when the user presses Send Invitations without pressing + first.
 */
export function resolveFinalInviteEmails(
  invitedEmails: string[],
  emailValue: string,
  options: { requireAtLeastOne?: boolean } = {},
): ResolveFinalInviteEmailsResult {
  const { requireAtLeastOne = false } = options;
  const normalizedInput = normalizeEmail(emailValue);
  const normalizedList = invitedEmails.map(normalizeEmail).filter(Boolean);

  if (normalizedInput) {
    if (!isValidEmail(normalizedInput)) {
      return { ok: false, error: INVITE_EMAIL_ERRORS.invalid };
    }
    if (hasDuplicateEmail(normalizedList, normalizedInput)) {
      return { ok: false, error: INVITE_EMAIL_ERRORS.duplicate };
    }
  }

  const finalEmails = normalizedInput
    ? Array.from(new Set([...normalizedList, normalizedInput]))
    : Array.from(new Set(normalizedList));

  if (finalEmails.length === 0 && requireAtLeastOne) {
    return { ok: false, error: INVITE_EMAIL_ERRORS.empty };
  }

  return { ok: true, finalEmails };
}
