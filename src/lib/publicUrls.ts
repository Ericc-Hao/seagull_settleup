/** Default production web base — keep in sync with supabase/functions/_shared/appUrls.ts */
export const PUBLIC_WEB_BASE_DEFAULT = 'https://split.seagullcoffee.ca';

/** Production web base URL (no trailing slash). Uses EXPO_PUBLIC_AUTH_REDIRECT_URL when set. */
export function getPublicWebBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() || PUBLIC_WEB_BASE_DEFAULT).replace(/\/+$/, '');
}

export function getPasswordResetUrl(): string {
  return `${getPublicWebBaseUrl()}/reset-password`;
}

export function getInvitationUrl(token: string): string {
  return `${getPublicWebBaseUrl()}/register?invite=${encodeURIComponent(token)}`;
}
