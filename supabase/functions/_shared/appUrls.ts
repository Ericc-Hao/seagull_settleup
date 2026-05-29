const DEFAULT_PUBLIC_APP_URL = 'https://split.seagullcoffee.ca';

export function getPublicAppUrl(): string {
  const configured = Deno.env.get('PUBLIC_APP_URL')?.trim();
  const base = configured || DEFAULT_PUBLIC_APP_URL;
  return base.replace(/\/+$/, '');
}

export function getPasswordResetUrl(): string {
  const redirectTo = Deno.env.get('PASSWORD_RESET_REDIRECT_URL')?.trim();
  return (redirectTo || `${getPublicAppUrl()}/reset-password`).replace(/\/+$/, '');
}

export function getInvitationUrl(token: string): string {
  return `${getPublicAppUrl()}/register?invite=${encodeURIComponent(token)}`;
}
