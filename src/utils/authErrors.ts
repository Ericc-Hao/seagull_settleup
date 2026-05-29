import { getErrorMessage } from './errors';

const RECOVERABLE_SESSION_FRAGMENTS = [
  'invalid refresh token',
  'refresh token not found',
  'refresh_token_not_found',
  'session_not_found',
  'jwt expired',
  'jwt issued at future',
  'invalid jwt',
  'invalid claim',
] as const;

export const CLOCK_SYNC_NOTICE =
  'Your device time may be out of sync. Please check your system clock and try logging in again.';

export function isRecoverableAuthSessionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return RECOVERABLE_SESSION_FRAGMENTS.some((fragment) => message.includes(fragment));
}

export function isInvalidCredentialsError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('invalid login credentials')) {
    return true;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code?: string }).code ?? '').toLowerCase();
    return code === 'invalid_credentials';
  }
  return false;
}

export function isJwtClockSyncError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('jwt issued at future');
}

export function toUserFriendlyAuthError(error: unknown): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code ?? '').toLowerCase()
      : '';

  if (lower.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Invalid email or password.';
  }
  if (lower.includes('invalid refresh token') || lower.includes('refresh token not found')) {
    return 'Your session expired. Please log in again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
    return 'Could not connect. Please check your network.';
  }

  return 'Something went wrong. Please try again.';
}
