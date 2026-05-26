import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { getAccessibleGroupOptions } from '../services/groupService';
import type { GroupSelectorOption } from '../types/views';
import { createLogger } from '../utils/logger';

const logger = createLogger('useGroups');

export function useGroups() {
  const { versions, ready } = useAppData();
  const [groups, setGroups] = useState<GroupSelectorOption[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const loadFromCache = useCallback((background: boolean) => {
    if (!ready) {
      return;
    }
    if (background) {
      setRefreshing(true);
    } else if (!hasLoadedOnceRef.current) {
      setInitialLoading(true);
    }

    logger.info('useGroups cache read started', { background });
    const data = getAccessibleGroupOptions();
    setGroups(data);
    hasLoadedOnceRef.current = true;
    setHasLoadedOnce(true);
    setInitialLoading(false);
    setRefreshing(false);
    logger.info('useGroups cache read succeeded', { count: data.length });
  }, [ready]);

  useEffect(() => {
    loadFromCache(false);
  }, [loadFromCache, versions.groups]);

  return useMemo(
    () => ({
      groups,
      loading: initialLoading || refreshing,
      initialLoading,
      refreshing,
      hasLoadedOnce,
      error: null,
      refetch: () => loadFromCache(true),
    }),
    [groups, hasLoadedOnce, initialLoading, loadFromCache, refreshing],
  );
}
