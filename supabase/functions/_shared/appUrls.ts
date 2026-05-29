/** Default production web base — keep in sync with src/lib/publicUrls.ts */
export const PUBLIC_APP_BASE_DEFAULT = 'https://split.seagullcoffee.ca';

export function getPublicAppUrl(): string {
  const configured = Deno.env.get('PUBLIC_APP_URL')?.trim();
  const base = configured || PUBLIC_APP_BASE_DEFAULT;
  return base.replace(/\/+$/, '');
}

export function getPasswordResetUrl(): string {
  const redirectTo = Deno.env.get('PASSWORD_RESET_REDIRECT_URL')?.trim();
  return (redirectTo || `${getPublicAppUrl()}/reset-password`).replace(/\/+$/, '');
}

export function getInvitationUrl(token: string): string {
  return `${getPublicAppUrl()}/register?invite=${encodeURIComponent(token)}`;
}
