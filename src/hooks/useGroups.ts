import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchAccessibleGroupOptions } from '../services/groupService';
import type { GroupSelectorOption } from '../types/views';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('useGroups');

export function useGroups() {
  const [groups, setGroups] = useState<GroupSelectorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    setError(null);
    logger.info('useGroups fetch started', { background });

    try {
      const data = await fetchAccessibleGroupOptions();
      setGroups(data ?? []);
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
      logger.info('useGroups fetch succeeded', { count: data.length });
    } catch (err) {
      logger.error('useGroups fetch failed', err);
      setError(toUserFriendlyError(err, 'Could not load groups.'));
      setGroups([]);
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refetch(false);
  }, [refetch]);

  return {
    groups,
    loading,
    initialLoading,
    refreshing,
    hasLoadedOnce,
    error,
    refetch: () => void refetch(true),
  };
}
