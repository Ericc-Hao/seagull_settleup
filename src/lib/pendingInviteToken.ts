import { authStorage } from './authStorage';

const STORAGE_KEY = 'pending_invite_token';

export async function setPendingInviteToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    return;
  }
  await authStorage.setItem(STORAGE_KEY, trimmed);
}

export async function getPendingInviteToken(): Promise<string | null> {
  const value = await authStorage.getItem(STORAGE_KEY);
  return value?.trim() || null;
}

export async function clearPendingInviteToken(): Promise<void> {
  await authStorage.removeItem(STORAGE_KEY);
}

export function extractInviteTokenFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get('invite')?.trim();
    return token || null;
  } catch {
    const match = url.match(/[?&]invite=([^&#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]).trim() : null;
  }
}
