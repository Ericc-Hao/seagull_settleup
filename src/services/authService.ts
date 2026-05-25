import type { Session, User } from '@supabase/supabase-js';

import { clearCachedUserId, setCachedUserId } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/logger';
import { maskEmail } from '../utils/validation';
import { updateAvatar } from './profileService';

const logger = createLogger('authService');

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  avatarUri?: string;
}

export async function signUpWithEmail(input: SignUpInput): Promise<{ user: User | null; session: Session | null }> {
  const email = input.email.trim();
  const displayName = input.displayName.trim();
  const phone = input.phone.trim();

  logger.info('Sign up started', { email: maskEmail(email), table: 'auth.users' });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          display_name: displayName,
          name: displayName,
          phone,
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
        phone,
        avatar_url: avatarUrl ?? null,
        emt_email: email,
        emt_phone: phone,
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
  const normalizedEmail = email.trim();
  logger.info('Sign in started', { email: maskEmail(normalizedEmail), table: 'auth.users' });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw error;
    }
    if (!data.user || !data.session) {
      throw new Error('Unable to sign in. Please try again.');
    }

    setCachedUserId(data.user.id);
    logger.info('Sign in succeeded', { userId: data.user.id, table: 'auth.users' });
    return { user: data.user, session: data.session };
  } catch (error) {
    logger.error('Sign in failed', error, { email: maskEmail(normalizedEmail), table: 'auth.users' });
    throw error;
  }
}

export async function signOut(): Promise<void> {
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
