/**
 * Redirect URL configuration for password recovery.
 *
 * Add to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   - https://split.seagullcoffee.ca/reset-password
 *
 * Set EXPO_PUBLIC_AUTH_REDIRECT_URL in .env (defaults to https://split.seagullcoffee.ca).
 */

const DEFAULT_AUTH_REDIRECT_BASE = 'https://split.seagullcoffee.ca';

/** Base web URL used for password recovery redirects. */
export const AUTH_REDIRECT_BASE = (
  process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || DEFAULT_AUTH_REDIRECT_BASE
).replace(/\/+$/, '');

/** Redirect URL embedded in the password recovery email. */
export function getPasswordResetRedirectUrl(): string {
  return `${AUTH_REDIRECT_BASE}/reset-password`;
}
