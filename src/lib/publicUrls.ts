const DEFAULT_PUBLIC_WEB_BASE = 'https://split.seagullcoffee.ca'; // keep in sync with supabase/functions/_shared/appUrls.ts

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
