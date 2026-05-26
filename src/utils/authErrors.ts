import { getErrorMessage } from './errors';

const JWT_TIMING_FRAGMENTS = [
  'jwt issued at future',
  'jwt expired',
  'invalid jwt',
  'invalid claim',
  'session_not_found',
  'refresh_token_not_found',
] as const;

export const CLOCK_SYNC_NOTICE =
  'Your device time may be out of sync. Please check your system clock and try logging in again.';

export function isJwtTimingError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return JWT_TIMING_FRAGMENTS.some((fragment) => message.includes(fragment));
}

export function isRecoverableAuthError(error: unknown): boolean {
  return isJwtTimingError(error);
}
