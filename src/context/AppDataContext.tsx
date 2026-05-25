import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { initAuth } from '../lib/auth';
import { refreshCache } from '../lib/supabaseSnapshot';
import { syncPendingInvitationsForCurrentUser } from '../services/invitationService';
import { ensureProfileExists } from '../services/profileService';
import { createLogger } from '../utils/logger';

const logger = createLogger('AppDataContext');

interface AppDataContextValue {
  version: number;
  ready: boolean;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    await initAuth();
    await ensureProfileExists();
    try {
      await syncPendingInvitationsForCurrentUser();
    } catch (error) {
      logger.error('Sync pending invitations during refresh failed', error);
    }
    await refreshCache();
    setVersion((current) => current + 1);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ version, ready, refresh }), [version, ready, refresh]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
