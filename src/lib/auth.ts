import { supabase } from './supabase';

let cachedUserId = '';

export function getCachedUserId(): string {
  return cachedUserId;
}

export function setCachedUserId(userId: string): void {
  cachedUserId = userId;
}

export function clearCachedUserId(): void {
  cachedUserId = '';
}

export async function initAuth(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) {
    cachedUserId = data.session.user.id;
  } else {
    cachedUserId = '';
  }
  return cachedUserId;
}

export async function refreshAuthUserId(): Promise<string> {
  return initAuth();
}
