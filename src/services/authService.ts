import type { Session, User } from '@supabase/supabase-js';

import { clearCachedUserId, setCachedUserId } from '../lib/auth';
import { resetAppDataCache } from '../context/appDataBridge';
import { getPasswordResetRedirectUrl } from '../lib/authRedirect';
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

/**
 * On web, exchange a PKCE recovery `code` from the current URL (password reset
 * email link). Returns true when a code was present and exchanged successfully.
 */
export async function exchangeRecoveryCodeFromUrl(url?: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const search =
    url !== undefined
      ? (() => {
          try {
            return new URL(url).search;
          } catch {
            return '';
          }
        })()
      : window.location.search;

  const params = new URLSearchParams(search);
  const errorDescription = params.get('error_description');
  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const code = params.get('code');
  if (!code) {
    return false;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }

  if (url === undefined) {
    window.history.replaceState({}, document.title, window.location.pathname);
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
 * Send a password recovery email. Always resolves successfully so callers can
 * show a generic confirmation without revealing whether the email exists.
 */
export async function recoverPassword(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  logger.info('Password recovery requested', { email: maskEmail(normalizedEmail), table: 'auth.users' });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) {
      throw error;
    }
    logger.info('Password recovery email sent', { email: maskEmail(normalizedEmail), table: 'auth.users' });
  } catch (error) {
    // Do not surface whether the account exists; log for diagnostics only.
    logger.warn('Password recovery request failed', {
      email: maskEmail(normalizedEmail),
      reason: toUserFriendlyAuthError(error),
      table: 'auth.users',
    });
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
