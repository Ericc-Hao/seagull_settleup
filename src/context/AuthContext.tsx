import type { Session, User } from '@supabase/supabase-js';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { clearCachedUserId, setCachedUserId } from '../lib/auth';
import { resetAppDataCache } from './appDataBridge';
import {
  listenToAuthChanges,
  refreshAuthSession,
  restoreAuthSession,
  signInWithEmail,
  signOut as signOutService,
  signOutLocal,
  signUpWithEmail,
} from '../services/authService';
import { ensureProfileExists } from '../services/profileService';
import { syncPendingInvitationsForCurrentUser } from '../services/invitationService';
import { CLOCK_SYNC_NOTICE, isJwtTimingError } from '../utils/authErrors';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthContext');

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authInitialized: boolean;
  isAuthenticated: boolean;
  sessionNotice: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    avatarUri?: string;
  }) => Promise<void>;
  signOut: (options?: { local?: boolean; reason?: 'jwt_timing_error' }) => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  clearError: () => void;
  clearSessionNotice: () => void;
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const jwtTimingFailureCount = useRef(0);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    if (nextSession?.user?.id) {
      setCachedUserId(nextSession.user.id);
    } else {
      clearCachedUserId();
      resetAppDataCache();
    }
  }, []);

  const markJwtTimingFailure = useCallback(() => {
    jwtTimingFailureCount.current += 1;
    if (jwtTimingFailureCount.current >= 2) {
      setSessionNotice(CLOCK_SYNC_NOTICE);
    }
  }, []);

  const handleInvalidSession = useCallback(async () => {
    logger.warn('Local sign out due to invalid session', { reason: 'jwt_timing_error' });
    markJwtTimingFailure();
    await signOutLocal();
    applySession(null);
  }, [applySession, markJwtTimingFailure]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        const { session: restoredSession, invalidatedDueToJwt } = await restoreAuthSession();
        if (!mounted) {
          return;
        }
        applySession(restoredSession);
        if (invalidatedDueToJwt) {
          markJwtTimingFailure();
        }
      } catch (err: unknown) {
        if (!mounted) {
          return;
        }
        if (isJwtTimingError(err)) {
          await handleInvalidSession();
        } else {
          logger.error('Restore session failed', err);
          setError(toUserFriendlyError(err, 'Unable to restore session.'));
        }
      } finally {
        if (mounted) {
          setAuthInitialized(true);
          setLoading(false);
          const subscription = listenToAuthChanges((nextSession) => {
            applySession(nextSession);
          });
          unsubscribe = () => subscription.unsubscribe();
        }
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [applySession, handleInvalidSession, markJwtTimingFailure]);

  const refreshSession = useCallback(async () => {
    try {
      const refreshedSession = await refreshAuthSession();
      applySession(refreshedSession);
      return refreshedSession;
    } catch (err) {
      if (isJwtTimingError(err)) {
        await handleInvalidSession();
      }
      throw err;
    }
  }, [applySession, handleInvalidSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setSessionNotice(null);
    jwtTimingFailureCount.current = 0;
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
    setSessionNotice(null);
    jwtTimingFailureCount.current = 0;
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

  const signOut = useCallback(async (options?: { local?: boolean; reason?: 'jwt_timing_error' }) => {
    setLoading(true);
    setError(null);
    if (options?.reason === 'jwt_timing_error') {
      markJwtTimingFailure();
    }
    logger.info('Logout started', { local: Boolean(options?.local) });
    try {
      if (options?.local) {
        await signOutLocal();
      } else {
        await signOutService();
      }
      applySession(null);
      logger.info('Logout succeeded', { local: Boolean(options?.local) });
    } catch (err) {
      logger.error('Logout failed', err);
      setError(toUserFriendlyError(err, 'Unable to log out.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applySession, markJwtTimingFailure]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      authInitialized,
      isAuthenticated: Boolean(session),
      sessionNotice,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
      clearError: () => setError(null),
      clearSessionNotice: () => setSessionNotice(null),
    }),
    [authInitialized, error, loading, refreshSession, session, sessionNotice, signIn, signOut, signUp],
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
