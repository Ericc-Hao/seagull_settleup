const DEFAULT_PUBLIC_WEB_BASE = 'https://split.seagullcoffee.ca';

/** Production web base URL (no trailing slash). Uses EXPO_PUBLIC_AUTH_REDIRECT_URL when set. */
export function getPublicWebBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || DEFAULT_PUBLIC_WEB_BASE).replace(/\/+$/, '');
}

export function getPasswordResetUrl(): string {
  return `${getPublicWebBaseUrl()}/reset-password`;
}

export function getInvitationUrl(token: string): string {
  return `${getPublicWebBaseUrl()}/register?invite=${encodeURIComponent(token)}`;
}

/** @deprecated Prefer getPasswordResetUrl */
export const AUTH_REDIRECT_BASE = getPublicWebBaseUrl();

/** @deprecated Prefer getPasswordResetUrl */
export function getPasswordResetRedirectUrl(): string {
  return getPasswordResetUrl();
}
