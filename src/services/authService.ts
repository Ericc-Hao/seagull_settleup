import type { Session, User } from '@supabase/supabase-js';

import { clearCachedUserId, setCachedUserId } from '../lib/auth';
import { getPublicWebBaseUrl } from '../lib/publicUrls';
import { resetAppDataCache } from '../context/appDataBridge';
import { clearSupabaseAuthStorage } from '../lib/authStorage';
import { supabase } from '../lib/supabase';
import {
  isInvalidCredentialsError,
  isRecoverableAuthSessionError,
  toUserFriendlyAuthError,
} from '../utils/authErrors';
import { createLogger } from '../utils/logger';
import { maskEmail, normalizeEmail } from '../utils/validation';
import { updateAvatar } from './profileService';

const logger = createLogger('authService');

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  avatarUri?: string;
}

export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthValidationError';
  }
}

export class PasswordRecoverySendError extends Error {
  constructor(
    message = 'Could not send password reset email right now. Please try again.',
  ) {
    super(message);
    this.name = 'PasswordRecoverySendError';
  }
}

export type RecoveryLinkError = {
  errorCode?: string | null;
  errorDescription?: string | null;
};

export const RECOVERY_LINK_EXPIRED_MESSAGE =
  'This reset link is invalid or has expired. Please request a new password reset email.';

export function isRecoveryLinkExpiredError(linkError: RecoveryLinkError | null | undefined): boolean {
  if (!linkError) {
    return false;
  }

  if (linkError.errorCode === 'otp_expired') {
    return true;
  }

  const description = linkError.errorDescription?.toLowerCase() ?? '';
  return description.includes('expired') || description.includes('invalid');
}

export function isExpiredRecoveryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('otp_expired') ||
    message.includes('expired') ||
    message.includes('invalid or has expired')
  );
}

function readRecoveryUrlParams(url?: string): URLSearchParams | null {
  const targetUrl = url ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  if (!targetUrl) {
    return null;
  }

  try {
    const parsed = new URL(
      targetUrl,
      typeof window !== 'undefined' ? window.location.origin : getPublicWebBaseUrl(),
    );
    const params = new URLSearchParams(parsed.search);
    if (parsed.hash.startsWith('#')) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      hashParams.forEach((value, key) => {
        params.set(key, value);
      });
    }
    return params;
  } catch {
    return null;
  }
}

export function parseRecoveryLinkErrorFromUrl(url?: string): RecoveryLinkError | null {
  const params = readRecoveryUrlParams(url);
  if (!params) {
    return null;
  }

  const errorCode = params.get('error_code');
  const errorDescription = params.get('error_description');
  const error = params.get('error');
  if (!errorCode && !errorDescription && !error) {
    return null;
  }

  return { errorCode, errorDescription };
}

export function parseRecoveryTokenHashFromUrl(url?: string): string | null {
  const params = readRecoveryUrlParams(url);
  if (!params) {
    return null;
  }

  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (!tokenHash || type !== 'recovery') {
    return null;
  }

  return tokenHash;
}

export function hasRecoveryCodeInUrl(url?: string): boolean {
  return Boolean(readRecoveryUrlParams(url)?.get('code'));
}

export function clearRecoveryParamsFromBrowserUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.history.replaceState({}, document.title, window.location.pathname);
}

export async function verifyRecoveryTokenHash(tokenHash: string): Promise<void> {
  logger.info('Recovery token verification started', { table: 'auth.users' });
  const { error } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  });
  if (error) {
    logger.warn('Recovery token verification failed', {
      reason: toUserFriendlyAuthError(error),
      table: 'auth.users',
    });
    throw error;
  }
  logger.info('Recovery token verification succeeded', { table: 'auth.users' });
}

/**
 * On web, exchange a PKCE recovery `code` from the current URL (password reset
 * email link). Returns true when a code was present and exchanged successfully.
 */
export async function exchangeRecoveryCodeFromUrl(url?: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const linkError = parseRecoveryLinkErrorFromUrl(url);
  if (linkError?.errorDescription) {
    throw new Error(linkError.errorDescription);
  }
  if (linkError?.errorCode) {
    throw new Error(linkError.errorCode);
  }

  const params = readRecoveryUrlParams(url);
  const code = params?.get('code');
  if (!code) {
    return false;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }

  if (url === undefined) {
    clearRecoveryParamsFromBrowserUrl();
  }

  return true;
}

export async function clearLocalAuthSession(): Promise<void> {
  logger.info('Clear local auth session started', { table: 'auth.users' });
  await signOutLocal();
  resetAppDataCache();
  logger.info('Clear local auth session succeeded', { table: 'auth.users' });
}

export async function signUpWithEmail(input: SignUpInput): Promise<{ user: User | null; session: Session | null }> {
  const email = input.email.trim();
  const displayName = input.displayName.trim();
  const phone = input.phone?.trim() ?? '';

  logger.info('Sign up started', { email: maskEmail(email), table: 'auth.users' });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          display_name: displayName,
          name: displayName,
          ...(phone ? { phone } : {}),
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      setCachedUserId(data.user.id);
      if (!data.session) {
        throw new Error(
          'Account created, but no session was returned. Please confirm that email verification is disabled in Supabase Auth settings.',
        );
      }

      logger.info('Profile creation after sign up started', { userId: data.user.id, table: 'profiles' });
      const avatarUrl = input.avatarUri ? await updateAvatar(data.user.id, input.avatarUri) : undefined;
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: displayName,
        email,
        phone: phone || null,
        avatar_url: avatarUrl ?? null,
        emt_email: email,
        emt_phone: phone || null,
        default_currency: 'CAD',
        onboarding_completed: true,
      });
      if (profileError) {
        logger.error('Profile creation after sign up failed', profileError, {
          userId: data.user.id,
          table: 'profiles',
        });
        throw profileError;
      }
      logger.info('Profile creation after sign up succeeded', { userId: data.user.id, table: 'profiles' });
    }

    logger.info('Sign up succeeded', { userId: data.user?.id, table: 'auth.users' });
    return { user: data.user, session: data.session };
  } catch (error) {
    logger.error('Sign up failed', error, { email: maskEmail(email), table: 'auth.users' });
    throw error;
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; session: Session }> {
  const normalizedEmail = normalizeEmail(email);
  logger.info('Sign in started', { email: maskEmail(normalizedEmail), table: 'auth.users' });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      if (isInvalidCredentialsError(error)) {
        logger.warn('Sign in failed', { reason: 'invalid_credentials', table: 'auth.users' });
        throw new AuthValidationError(toUserFriendlyAuthError(error));
      }
      throw error;
    }
    if (!data.user || !data.session) {
      throw new Error('Unable to sign in. Please try again.');
    }

    setCachedUserId(data.user.id);
    logger.info('Sign in succeeded', { userId: data.user.id, table: 'auth.users' });
    return { user: data.user, session: data.session };
  } catch (error) {
    if (error instanceof AuthValidationError) {
      throw error;
    }
    if (isInvalidCredentialsError(error)) {
      logger.warn('Sign in failed', { reason: 'invalid_credentials', table: 'auth.users' });
      throw new AuthValidationError(toUserFriendlyAuthError(error));
    }
    logger.error('Sign in failed', error, { email: maskEmail(normalizedEmail), table: 'auth.users' });
    throw error;
  }
}

/**
 * Request a password reset email via the send-password-reset edge function.
 * Throws PasswordRecoverySendError only when delivery fails; never reveals
 * whether the email is registered.
 */
export async function recoverPassword(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  logger.info('Password recovery requested', { email: maskEmail(normalizedEmail), table: 'auth.users' });

  try {
    const { data, error } = await supabase.functions.invoke('send-password-reset', {
      body: { email: normalizedEmail },
    });

    if (error) {
      logger.warn('Password recovery request failed', {
        email: maskEmail(normalizedEmail),
        reason: error.message,
        table: 'auth.users',
      });
      throw new PasswordRecoverySendError();
    }

    const payload = data as { ok?: boolean; message?: string; error?: string } | null;
    if (!payload?.ok) {
      logger.warn('Password recovery request failed', {
        email: maskEmail(normalizedEmail),
        reason: payload?.error ?? 'send_password_reset_failed',
        table: 'auth.users',
      });
      throw new PasswordRecoverySendError();
    }

    logger.info('Password recovery request accepted', {
      email: maskEmail(normalizedEmail),
      table: 'auth.users',
    });
  } catch (error) {
    if (error instanceof PasswordRecoverySendError) {
      throw error;
    }
    logger.warn('Password recovery request failed', {
      email: maskEmail(normalizedEmail),
      reason: toUserFriendlyAuthError(error),
      table: 'auth.users',
    });
    throw new PasswordRecoverySendError();
  }
}

export async function signOut(options?: { local?: boolean }): Promise<void> {
  if (options?.local) {
    await signOutLocal();
    return;
  }

  logger.info('Sign out started', { table: 'auth.users' });
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    clearCachedUserId();
    logger.info('Sign out succeeded', { table: 'auth.users' });
  } catch (error) {
    logger.error('Sign out failed', error, { table: 'auth.users' });
    throw error;
  }
}

export async function signOutLocal(): Promise<void> {
  logger.info('Local sign out started', { table: 'auth.users' });
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw error;
    }
  } catch (error) {
    logger.warn('Local sign out via Supabase failed, clearing auth storage fallback', {
      reason: isRecoverableAuthSessionError(error) ? 'recoverable_session_error' : 'sign_out_failed',
    });
    await clearSupabaseAuthStorage();
  }

  clearCachedUserId();
  logger.info('Local sign out succeeded', { table: 'auth.users' });
}

export async function refreshAuthSession(): Promise<Session | null> {
  logger.info('Auth session refresh started', { table: 'auth.users' });
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (isRecoverableAuthSessionError(error)) {
        logger.warn('Auth session refresh failed due to recoverable session error', {
          reason: 'recoverable_session_error',
          table: 'auth.users',
        });
      } else {
        logger.error('Auth session refresh failed', error, { table: 'auth.users' });
      }
      throw error;
    }

    if (data.session?.user?.id) {
      setCachedUserId(data.session.user.id);
    }

    logger.info('Auth session refresh succeeded', {
      hasSession: Boolean(data.session),
      table: 'auth.users',
    });
    return data.session;
  } catch (error) {
    if (!isRecoverableAuthSessionError(error)) {
      logger.error('Auth session refresh failed', error, { table: 'auth.users' });
    }
    throw error;
  }
}

export async function restoreAuthSession(): Promise<{
  session: Session | null;
  invalidatedDueToRecoverableError: boolean;
}> {
  logger.info('Auth session restore started', { table: 'auth.users' });
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isRecoverableAuthSessionError(error)) {
        logger.warn('Auth session restore failed due to recoverable session error', {
          reason: 'recoverable_session_error',
          table: 'auth.users',
        });
        await clearLocalAuthSession();
        return { session: null, invalidatedDueToRecoverableError: true };
      }
      throw error;
    }

    if (!data.session) {
      logger.info('Auth session restore succeeded', { hasSession: false, table: 'auth.users' });
      return { session: null, invalidatedDueToRecoverableError: false };
    }

    try {
      const refreshedSession = await refreshAuthSession();
      logger.info('Auth session restore succeeded', {
        hasSession: Boolean(refreshedSession),
        table: 'auth.users',
      });
      return { session: refreshedSession, invalidatedDueToRecoverableError: false };
    } catch (refreshError) {
      if (isRecoverableAuthSessionError(refreshError)) {
        logger.warn('Local sign out due to invalid session during restore', {
          reason: 'recoverable_session_error',
          table: 'auth.users',
        });
        await clearLocalAuthSession();
        return { session: null, invalidatedDueToRecoverableError: true };
      }
      throw refreshError;
    }
  } catch (error) {
    if (isRecoverableAuthSessionError(error)) {
      logger.warn('Auth session restore failed due to recoverable session error', {
        reason: 'recoverable_session_error',
        table: 'auth.users',
      });
      await clearLocalAuthSession();
      return { session: null, invalidatedDueToRecoverableError: true };
    }
    logger.error('Auth session restore failed', error, { table: 'auth.users' });
    throw error;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  logger.debug('Get current session started', { table: 'auth.users' });
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    logger.debug('Get current session succeeded', { hasSession: Boolean(data.session) });
    return data.session;
  } catch (error) {
    logger.error('Get current session failed', error, { table: 'auth.users' });
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  logger.debug('Get current user started', { table: 'auth.users' });
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    logger.debug('Get current user succeeded', { userId: data.user?.id });
    return data.user;
  } catch (error) {
    logger.error('Get current user failed', error, { table: 'auth.users' });
    throw error;
  }
}

export function listenToAuthChanges(
  callback: (session: Session | null) => void,
): { unsubscribe: () => void } {
  logger.debug('Auth state listener registered');
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    logger.debug('Auth state changed', { event, hasSession: Boolean(session) });
    if (session?.user?.id) {
      setCachedUserId(session.user.id);
    } else {
      clearCachedUserId();
    }
    callback(session);
  });

  return {
    unsubscribe: () => {
      logger.debug('Auth state listener unregistered');
      data.subscription.unsubscribe();
    },
  };
}
