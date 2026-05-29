import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { refreshNotificationsExternal, registerCacheResetHandler } from './appDataBridge';
import type {
  AppDataLoadingState,
  AppDataTimestamps,
  AppDataVersions,
  InvalidationPayload,
  InvalidationType,
} from './appDataTypes';
import {
  EMPTY_VERSIONS,
  invalidationTouchesInvitations,
  invalidationTouchesNotifications,
  touchTimestampsForType,
} from './appDataTypes';
import { initAuth } from '../lib/auth';
import { createEmptySnapshot, setCache } from '../lib/dataCache';
import {
  ALL_CACHE_SLICES,
  type CacheSliceKey,
  getLoadingKeysForSlices,
  refreshAllCache,
  refreshCacheSlice,
} from '../lib/cacheRefresh';
import { invalidateGroupParticipantCache } from '../lib/groupParticipantCache';
import { syncPendingInvitationsForCurrentUser } from '../services/invitationService';
import { ensureProfileExists } from '../services/profileService';
import type { PendingInvitationView } from '../types/views';
import { debounce } from '../utils/debounce';
import { createLogger } from '../utils/logger';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';

const logger = createLogger('AppDataContext');

const STALE_THRESHOLD_MS = 30_000;
const INVALIDATION_DEBOUNCE_MS = 250;

import {
  bumpVersionsForInvalidations,
  collectGroupDetailIds,
  collectSlices,
  filterInvalidationsWithSuccessfulSlices,
  touchTimestampsForInvalidations,
  type QueuedInvalidation,
} from './appDataInvalidation';

interface AppDataContextValue {
  versions: AppDataVersions;
  /** @deprecated Use slice-specific versions from `versions` */
  version: number;
  ready: boolean;
  pendingInvitations: PendingInvitationView[];
  timestamps: AppDataTimestamps;
  loading: AppDataLoadingState;
  invalidate: (type: InvalidationType, payload?: InvalidationPayload) => void;
  refresh: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshHomeData: () => void;
  refreshGroups: () => void;
  refreshExpenses: () => void;
  refreshNotifications: () => Promise<void>;
  refreshProfile: () => void;
  refreshGroupDetail: (groupId: string) => void;
  refreshSettlements: (groupId?: string) => void;
  refreshInvitations: () => Promise<void>;
  isStale: (type: InvalidationType, thresholdMs?: number) => boolean;
  refreshIfStale: (types: InvalidationType[]) => Promise<void>;
  getGroupDetailVersion: (groupId: string) => number;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const EMPTY_TIMESTAMPS: AppDataTimestamps = {
  lastProfileFetchAt: null,
  lastGroupsFetchAt: null,
  lastExpensesFetchAt: null,
  lastNotificationsFetchAt: null,
  lastSettlementsFetchAt: null,
  lastInvitationsFetchAt: null,
};

const EMPTY_LOADING: AppDataLoadingState = {
  profileLoading: false,
  groupsLoading: false,
  expensesLoading: false,
  notificationsLoading: false,
  settlementsLoading: false,
};

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [versions, setVersions] = useState<AppDataVersions>(EMPTY_VERSIONS);
  const [ready, setReady] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationView[]>([]);
  const [timestamps, setTimestamps] = useState<AppDataTimestamps>(EMPTY_TIMESTAMPS);
  const [loading, setLoading] = useState<AppDataLoadingState>(EMPTY_LOADING);

  const invalidationQueue = useRef<QueuedInvalidation[]>([]);
  const sliceInFlight = useRef(new Map<CacheSliceKey, Promise<void>>());
  const flushInFlight = useRef<Promise<void> | null>(null);

  const version = useMemo(
    () =>
      versions.profile +
      versions.home +
      versions.groups +
      versions.expenses +
      versions.notifications +
      versions.settlements +
      Object.values(versions.groupDetail).reduce((sum, value) => sum + value, 0),
    [versions],
  );

  const getGroupDetailVersion = useCallback(
    (groupId: string) => versions.groupDetail[groupId] ?? 0,
    [versions.groupDetail],
  );

  const refreshSliceDeduped = useCallback(async (slice: CacheSliceKey) => {
    const existing = sliceInFlight.current.get(slice);
    if (existing) {
      await existing;
      return;
    }

    const loadingKeys = getLoadingKeysForSlices([slice]);
    setLoading((current) => {
      const next = { ...current };
      for (const key of loadingKeys) {
        next[key] = true;
      }
      return next;
    });

    const task = refreshCacheSlice(slice).finally(() => {
      sliceInFlight.current.delete(slice);
      setLoading((current) => {
        const next = { ...current };
        for (const key of loadingKeys) {
          next[key] = false;
        }
        return next;
      });
    });

    sliceInFlight.current.set(slice, task);
    await task;
  }, []);

  const refreshSlicesWithSettled = useCallback(
    async (slices: CacheSliceKey[]) => {
      const uniqueSlices = Array.from(new Set(slices));
      if (uniqueSlices.length === 0) {
        return { successful: new Set<CacheSliceKey>(), failed: [] as CacheSliceKey[] };
      }

      const results = await Promise.allSettled(
        uniqueSlices.map(async (slice) => {
          await refreshSliceDeduped(slice);
          return slice;
        }),
      );

      const successful = new Set<CacheSliceKey>();
      const failed: CacheSliceKey[] = [];

      results.forEach((result, index) => {
        const slice = uniqueSlices[index];
        if (result.status === 'fulfilled') {
          successful.add(slice);
        } else {
          failed.push(slice);
          logger.error('Cache slice refresh failed', result.reason, { slice });
        }
      });

      if (failed.length > 0) {
        logger.warn('Partial cache refresh completed', {
          failed,
          succeeded: Array.from(successful),
        });
      }

      return { successful, failed };
    },
    [refreshSliceDeduped],
  );

  const runInvitationSync = useCallback(async () => {
    logger.info('Invitation sync started');
    try {
      const invitations = await syncPendingInvitationsForCurrentUser();
      setPendingInvitations(invitations);
      setTimestamps((current) => ({ ...current, lastInvitationsFetchAt: Date.now() }));
      logger.info('Invitation sync succeeded', { count: invitations.length });
    } catch (error) {
      logger.error('Invitation sync failed', error);
      setPendingInvitations([]);
    }
  }, []);

  const runNotificationsRefresh = useCallback(async (options?: { bumpVersion?: boolean }) => {
    const bumpVersion = options?.bumpVersion ?? true;
    setLoading((current) => ({ ...current, notificationsLoading: true }));
    logger.info('Notifications refresh started');
    try {
      await refreshNotificationsExternal({ background: true });
      setTimestamps((current) => ({ ...current, lastNotificationsFetchAt: Date.now() }));
      if (bumpVersion) {
        setVersions((current) => ({ ...current, notifications: current.notifications + 1 }));
      }
      logger.info('Notifications refresh succeeded');
    } catch (error) {
      logger.error('Notifications refresh failed', error);
    } finally {
      setLoading((current) => ({ ...current, notificationsLoading: false }));
    }
  }, []);

  const applyVersionAndTimestampBumps = useCallback((items: QueuedInvalidation[]) => {
    const now = Date.now();
    setVersions((current) => bumpVersionsForInvalidations(current, items));
    setTimestamps((current) => touchTimestampsForInvalidations(current, items, now));
    for (const item of items) {
      logger.info('Invalidation applied', { type: item.type, groupId: item.payload?.groupId });
    }
  }, []);

  const processInvalidationQueue = useCallback(async () => {
    if (flushInFlight.current) {
      await flushInFlight.current;
      return;
    }

    const batch = invalidationQueue.current.splice(0);
    if (batch.length === 0) {
      return;
    }

    const task = (async () => {
      const slices = collectSlices(batch);
      const needsInvitations = batch.some((item) => invalidationTouchesInvitations(item.type));
      const needsNotifications = batch.some((item) => invalidationTouchesNotifications(item.type));
      const groupDetailIds = collectGroupDetailIds(batch);

      logger.info('Processing invalidation batch', {
        count: batch.length,
        slices,
        // groupId scopes version counters; slice refresh remains full-table per slice.
        groupDetailIds,
      });

      let successfulSlices = new Set<CacheSliceKey>();

      if (batch.some((item) => item.type === 'all')) {
        try {
          await refreshAllCache();
          successfulSlices = new Set(ALL_CACHE_SLICES);
        } catch (error) {
          logger.error('Full cache refresh failed', error);
        }
      } else if (slices.length > 0) {
        const result = await refreshSlicesWithSettled(slices);
        successfulSlices = result.successful;
      }

      const applicableInvalidations = filterInvalidationsWithSuccessfulSlices(batch, successfulSlices);
      if (applicableInvalidations.length > 0) {
        applyVersionAndTimestampBumps(applicableInvalidations);
        for (const item of applicableInvalidations) {
          if (
            item.type === 'all' ||
            item.type === 'profile' ||
            item.type === 'group_members' ||
            item.type === 'group_detail' ||
            item.type === 'invitations'
          ) {
            invalidateGroupParticipantCache(item.payload?.groupId);
          }
        }
      }

      if (needsInvitations) {
        await runInvitationSync();
      }
      if (needsNotifications) {
        await runNotificationsRefresh({ bumpVersion: true });
      }
    })();

    flushInFlight.current = task;
    try {
      await task;
    } finally {
      flushInFlight.current = null;
    }
  }, [applyVersionAndTimestampBumps, refreshSlicesWithSettled, runInvitationSync, runNotificationsRefresh]);

  const debouncedProcessQueue = useMemo(
    () => debounce(() => void processInvalidationQueue(), INVALIDATION_DEBOUNCE_MS),
    [processInvalidationQueue],
  );

  const invalidate = useCallback(
    (type: InvalidationType, payload?: InvalidationPayload) => {
      logger.info('Invalidation queued', { type, groupId: payload?.groupId });
      invalidationQueue.current.push({ type, payload });
      debouncedProcessQueue();
    },
    [debouncedProcessQueue],
  );

  const resetAppData = useCallback(() => {
    invalidationQueue.current = [];
    invalidateGroupParticipantCache();
    setCache(createEmptySnapshot());
    setVersions(EMPTY_VERSIONS);
    setPendingInvitations([]);
    setTimestamps(EMPTY_TIMESTAMPS);
    setReady(false);
    logger.info('App data cache reset');
  }, []);

  useEffect(() => {
    registerCacheResetHandler(resetAppData);
    return () => registerCacheResetHandler(null);
  }, [resetAppData]);

  const refreshAll = useCallback(async () => {
    logger.info('App data refresh all started');
    await initAuth();
    await ensureProfileExists();
    await runInvitationSync();

    setLoading((current) => ({
      ...current,
      profileLoading: true,
      groupsLoading: true,
      expensesLoading: true,
      settlementsLoading: true,
    }));

    try {
      await refreshAllCache();
      setVersions({
        profile: 1,
        home: 1,
        groups: 1,
        expenses: 1,
        notifications: 0,
        settlements: 1,
        groupDetail: {},
      });
      setTimestamps({
        lastProfileFetchAt: Date.now(),
        lastGroupsFetchAt: Date.now(),
        lastExpensesFetchAt: Date.now(),
        lastSettlementsFetchAt: Date.now(),
        lastNotificationsFetchAt: null,
        lastInvitationsFetchAt: Date.now(),
      });
      await runNotificationsRefresh();
      setReady(true);
      logger.info('App data refresh all succeeded');
    } catch (error) {
      logger.error('App data refresh all failed', error);
      throw error;
    } finally {
      setLoading(EMPTY_LOADING);
    }
  }, [runInvitationSync, runNotificationsRefresh]);

  const refreshHomeData = useCallback(() => {
    invalidate('home');
  }, [invalidate]);

  const refreshGroups = useCallback(() => {
    invalidate('groups');
  }, [invalidate]);

  const refreshExpenses = useCallback(() => {
    invalidate('expenses');
  }, [invalidate]);

  const refreshNotifications = useCallback(async () => {
    await runNotificationsRefresh();
  }, [runNotificationsRefresh]);

  const refreshProfile = useCallback(() => {
    invalidate('profile');
  }, [invalidate]);

  const refreshGroupDetail = useCallback(
    (groupId: string) => {
      invalidate('group_detail', { groupId });
    },
    [invalidate],
  );

  const refreshSettlements = useCallback(
    (groupId?: string) => {
      invalidate('settlements', groupId ? { groupId } : undefined);
    },
    [invalidate],
  );

  const refreshInvitations = useCallback(async () => {
    await runInvitationSync();
    invalidate('invitations');
  }, [invalidate, runInvitationSync]);

  const isStale = useCallback(
    (type: InvalidationType, thresholdMs = STALE_THRESHOLD_MS) => {
      const touched = touchTimestampsForType(type, 0);
      const key = Object.keys(touched)[0] as keyof AppDataTimestamps | undefined;
      if (!key) {
        return true;
      }
      const last = timestamps[key];
      if (!last) {
        return true;
      }
      return Date.now() - last > thresholdMs;
    },
    [timestamps],
  );

  const refreshIfStale = useCallback(
    async (types: InvalidationType[]) => {
      const uniqueTypes = Array.from(new Set(types));
      const staleTypes = uniqueTypes.filter((type) => isStale(type));
      if (staleTypes.length === 0) {
        return;
      }
      logger.info('Stale focus refresh triggered', { types: staleTypes });
      for (const type of staleTypes) {
        invalidate(type);
      }
      await processInvalidationQueue();
    },
    [invalidate, isStale, processInvalidationQueue],
  );

  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;

  useEffect(() => {
    void refreshAllRef.current();
  }, []);

  useSupabaseRealtime(invalidate);

  const value = useMemo(
    () => ({
      versions,
      version,
      ready,
      pendingInvitations,
      timestamps,
      loading,
      invalidate,
      refresh: refreshAll,
      refreshAll,
      refreshHomeData,
      refreshGroups,
      refreshExpenses,
      refreshNotifications,
      refreshProfile,
      refreshGroupDetail,
      refreshSettlements,
      refreshInvitations,
      isStale,
      refreshIfStale,
      getGroupDetailVersion,
    }),
    [
      getGroupDetailVersion,
      invalidate,
      isStale,
      loading,
      pendingInvitations,
      ready,
      refreshAll,
      refreshExpenses,
      refreshGroupDetail,
      refreshGroups,
      refreshHomeData,
      refreshIfStale,
      refreshInvitations,
      refreshNotifications,
      refreshProfile,
      refreshSettlements,
      timestamps,
      version,
      versions,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}

export function useInvalidate() {
  const {
    invalidate,
    refreshAll,
    refreshHomeData,
    refreshGroups,
    refreshExpenses,
    refreshNotifications,
    refreshProfile,
    refreshGroupDetail,
    refreshSettlements,
    refreshInvitations,
  } = useAppData();
  return {
    invalidate,
    refreshAll,
    refreshHomeData,
    refreshGroups,
    refreshExpenses,
    refreshNotifications,
    refreshProfile,
    refreshGroupDetail,
    refreshSettlements,
    refreshInvitations,
  };
}
