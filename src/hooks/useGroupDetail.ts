import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import {
  deleteGroup,
  fetchGroupById,
  getCurrentUserId,
  getGroupById,
  reactivateGroup,
  setGroupInactive,
} from '../services/groupService';
import { getGroupExpenses, readDb } from '../services/dbHelpers';
import { getRecentGroupExpensesForCurrentUser } from '../services/expenseService';
import type { Group } from '../types/models';
import { formatOptionalDateRange } from '../utils/date';
import { formatCAD } from '../utils/money';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import {
  invalidateAfterDeleteGroup,
  invalidateAfterReactivateGroup,
  invalidateAfterSetGroupInactive,
} from '../utils/mutationInvalidation';
import { useGroupParticipants } from './useGroupParticipants';

const logger = createLogger('useGroupDetail');

export function useGroupDetail(groupId: string) {
  const { versions, ready, getGroupDetailVersion, invalidate } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [remoteGroup, setRemoteGroup] = useState<Group | undefined>();
  const [loadError, setLoadError] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();
  const [actionLoading, setActionLoading] = useState(false);

  const cachedGroup = useMemo(
    () => getGroupById(groupId),
    [groupId, versions.groups, groupDetailVersion],
  );
  const group = cachedGroup ?? remoteGroup;
  const {
    members,
    loading: loadingMembers,
    refreshing: membersRefreshing,
    refresh: refreshMembers,
  } = useGroupParticipants(group ? groupId : undefined, 'detail');

  useEffect(() => {
    if (cachedGroup) {
      setRemoteGroup(undefined);
      setLoadingGroup(false);
      setLoadError(undefined);
      return;
    }

    let mounted = true;
    setLoadingGroup(true);
    logger.info('Loading group detail', { groupId });
    void fetchGroupById(groupId)
      .then((next) => {
        if (!mounted) {
          return;
        }
        setRemoteGroup(next ?? undefined);
        setLoadError(next ? undefined : 'Group not found.');
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        logger.error('Loading group detail failed', error, { groupId });
        setLoadError(toUserFriendlyError(error, 'Unable to load group.'));
      })
      .finally(() => {
        if (mounted) {
          setLoadingGroup(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [cachedGroup, groupId, groupDetailVersion]);

  const userId = getCurrentUserId();
  const isOwner = group?.ownerId === userId;
  const currentUserRole = isOwner ? 'owner' : 'member';

  const totalSpentCents = useMemo(() => {
    if (!group) {
      return 0;
    }
    return getGroupExpenses(groupId, readDb()).reduce((sum, expense) => sum + expense.amountCents, 0);
  }, [group, groupId, versions.expenses, groupDetailVersion]);

  const recentExpenses = useMemo(
    () => (group ? getRecentGroupExpensesForCurrentUser(groupId, 5) : []),
    [group, groupId, versions.expenses, groupDetailVersion],
  );

  const setInactive = useCallback(async () => {
    setActionLoading(true);
    setActionError(undefined);
    logger.info('Set group inactive confirmation started', { groupId });
    try {
      await setGroupInactive(groupId);
      invalidateAfterSetGroupInactive(invalidate, groupId);
      logger.info('Set group inactive confirmation succeeded', { groupId });
    } catch (error) {
      logger.error('Set group inactive confirmation failed', error, { groupId });
      setActionError(toUserFriendlyError(error, 'Unable to set group inactive.'));
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, [groupId, invalidate]);

  const reactivate = useCallback(async () => {
    setActionLoading(true);
    setActionError(undefined);
    logger.info('Reactivate group confirmation started', { groupId });
    try {
      await reactivateGroup(groupId);
      invalidateAfterReactivateGroup(invalidate, groupId);
      logger.info('Reactivate group confirmation succeeded', { groupId });
    } catch (error) {
      logger.error('Reactivate group confirmation failed', error, { groupId });
      setActionError(toUserFriendlyError(error, 'Unable to reactivate group.'));
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, [groupId, invalidate]);

  const removeGroup = useCallback(async () => {
    setActionLoading(true);
    setActionError(undefined);
    logger.info('Delete group confirmation started', { groupId });
    try {
      await deleteGroup(groupId);
      invalidateAfterDeleteGroup(invalidate, groupId);
      logger.info('Delete group confirmation succeeded', { groupId });
    } catch (error) {
      logger.error('Delete group confirmation failed', error, { groupId });
      setActionError(toUserFriendlyError(error, 'Unable to delete group.'));
      throw error;
    } finally {
      setActionLoading(false);
    }
  }, [groupId, invalidate]);

  const dateLabel = useMemo(() => {
    if (!group) {
      return '';
    }
    if (group.status === 'inactive') {
      return 'Inactive';
    }
    return formatOptionalDateRange(group.startDate, group.endDate);
  }, [group]);

  return {
    group,
    loadingGroup: !ready || loadingGroup,
    loadError,
    members,
    loadingMembers,
    membersRefreshing,
    isOwner,
    currentUserRole,
    currentUserId: userId,
    isInactive: group?.status === 'inactive',
    dateLabel,
    totalSpentLabel: formatCAD(totalSpentCents),
    recentExpenses,
    setInactive,
    reactivate,
    removeGroup,
    actionError,
    actionLoading,
    refreshMembers,
  };
}
