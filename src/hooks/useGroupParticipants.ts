import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import {
  applyGroupParticipantFilter,
  getCachedGroupParticipants,
  getGroupParticipantsFromDbCache,
  loadGroupParticipants,
  type GroupParticipantFilter,
} from '../lib/groupParticipantCache';
import type { GroupMemberWithProfile } from '../types/views';
import { createLogger } from '../utils/logger';

const logger = createLogger('useGroupParticipants');

function readInitialMembers(groupId: string | undefined, filter: GroupParticipantFilter): GroupMemberWithProfile[] {
  if (!groupId) {
    return [];
  }
  const memoryCached = getCachedGroupParticipants(groupId);
  if (memoryCached && memoryCached.length > 0) {
    return applyGroupParticipantFilter(memoryCached, filter);
  }
  return applyGroupParticipantFilter(getGroupParticipantsFromDbCache(groupId), filter);
}

export function useGroupParticipants(groupId: string | undefined, filter: GroupParticipantFilter = 'split') {
  const { versions, getGroupDetailVersion } = useAppData();
  const cacheVersion = useMemo(() => {
    if (!groupId) {
      return 0;
    }
    return versions.groups + getGroupDetailVersion(groupId);
  }, [groupId, getGroupDetailVersion, versions.groups]);

  const [members, setMembers] = useState<GroupMemberWithProfile[]>(() => readInitialMembers(groupId, filter));
  const [loading, setLoading] = useState(() => readInitialMembers(groupId, filter).length === 0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const initialMembers = readInitialMembers(groupId, filter);
    if (initialMembers.length > 0) {
      setMembers(initialMembers);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }

    let cancelled = false;

    void loadGroupParticipants(groupId)
      .then((rows) => {
        if (cancelled) {
          return;
        }
        setMembers(applyGroupParticipantFilter(rows, filter));
      })
      .catch((error) => {
        if (!cancelled) {
          logger.warn('Group participants refresh failed', { groupId, filter }, error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, filter, cacheVersion]);

  const refresh = useCallback(async () => {
    if (!groupId) {
      return;
    }
    setRefreshing(true);
    try {
      const rows = await loadGroupParticipants(groupId, { force: true });
      setMembers(applyGroupParticipantFilter(rows, filter));
    } catch (error) {
      logger.warn('Group participants manual refresh failed', { groupId, filter }, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, filter]);

  return {
    members,
    loading,
    refreshing,
    refresh,
  };
}
