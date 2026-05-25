import type { Session, User } from '@supabase/supabase-js';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearCachedUserId, setCachedUserId } from '../lib/auth';
import { createEmptySnapshot, setCache } from '../lib/dataCache';
import {
  getCurrentSession,
  listenToAuthChanges,
  signInWithEmail,
  signOut as signOutService,
  signUpWithEmail,
} from '../services/authService';
import { ensureProfileExists } from '../services/profileService';
import { syncPendingInvitationsForCurrentUser } from '../services/invitationService';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthContext');

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    avatarUri?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) {
    return fallback;
  }
  if (err.message.toLowerCase().includes('email not confirmed')) {
    return 'Email confirmation is still enabled in Supabase. Please disable it in Auth settings or confirm the email before logging in.';
  }
  return err.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    if (nextSession?.user?.id) {
      setCachedUserId(nextSession.user.id);
    } else {
      clearCachedUserId();
      setCache(createEmptySnapshot());
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getCurrentSession()
      .then((currentSession) => {
        if (mounted) {
          applySession(currentSession);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          logger.error('Restore session failed', err);
          setError(toUserFriendlyError(err, 'Unable to restore session.'));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const subscription = listenToAuthChanges((nextSession) => {
      applySession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmail(email, password);
      applySession(result.session);
      await ensureProfileExists();
      try {
        await syncPendingInvitationsForCurrentUser();
      } catch (syncError) {
        logger.error('Sync pending invitations after sign in failed', syncError);
      }
    } catch (err) {
      setError(authMessage(err, 'Unable to log in.'));
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  const signUp = useCallback(async (input: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    avatarUri?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signUpWithEmail(input);
      applySession(result.session);
      await ensureProfileExists();
      try {
        await syncPendingInvitationsForCurrentUser();
      } catch (syncError) {
        logger.error('Sync pending invitations after sign in failed', syncError);
      }
    } catch (err) {
      setError(authMessage(err, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    logger.info('Logout started');
    try {
      await signOutService();
      applySession(null);
      logger.info('Logout succeeded');
    } catch (err) {
      logger.error('Logout failed', err);
      setError(toUserFriendlyError(err, 'Unable to log out.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isAuthenticated: Boolean(session),
      error,
      signIn,
      signUp,
      signOut,
      clearError: () => setError(null),
    }),
    [error, loading, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
