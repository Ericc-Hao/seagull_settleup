import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import {
  deleteGroup,
  fetchGroupById,
  getCurrentUserId,
  getGroupById,
  setGroupInactive,
} from '../services/groupService';
import { filterDetailMembers, getGroupMembersWithProfiles } from '../services/memberService';
import { getGroupExpenses, readDb } from '../services/dbHelpers';
import { getRecentGroupExpensesForCurrentUser } from '../services/expenseService';
import type { Group } from '../types/models';
import type { GroupMemberWithProfile } from '../types/views';
import { formatOptionalDateRange } from '../utils/date';
import { formatCAD } from '../utils/money';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import {
  invalidateAfterDeleteGroup,
  invalidateAfterSetGroupInactive,
} from '../utils/mutationInvalidation';

const logger = createLogger('useGroupDetail');

export function useGroupDetail(groupId: string) {
  const { versions, ready, getGroupDetailVersion, invalidate } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
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

  useEffect(() => {
    if (cachedGroup) {
      setRemoteGroup(undefined);
      setLoadingGroup(false);
      setLoadError(undefined);
      return;
    }
    if (!ready) {
      return;
    }

    let cancelled = false;
    setLoadingGroup(true);
    setLoadError(undefined);
    logger.info('Loading group detail', { groupId });

    void fetchGroupById(groupId)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        if (loaded) {
          setRemoteGroup(loaded);
          logger.info('Group detail loaded', { groupId });
        } else {
          setRemoteGroup(undefined);
          logger.warn('Group detail not found', { groupId });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        logger.error('Group detail load failed', error, { groupId });
        setLoadError(toUserFriendlyError(error, 'Unable to load this group.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingGroup(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cachedGroup, groupId, ready]);

  const userId = getCurrentUserId();
  const isOwner = group?.ownerId === userId;
  const currentUserRole = isOwner ? 'owner' : members.some((m) => m.userId === userId) ? 'member' : undefined;

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

  const loadMembers = useCallback(async () => {
    if (!group) {
      setMembers([]);
      setLoadingMembers(false);
      return;
    }
    setLoadingMembers(true);
    try {
      const rows = await getGroupMembersWithProfiles(groupId);
      setMembers(filterDetailMembers(rows));
    } catch (error) {
      logger.error('Load group members failed', error, { groupId });
      setActionError(toUserFriendlyError(error, 'Unable to load group members.'));
    } finally {
      setLoadingMembers(false);
    }
  }, [group, groupId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers, versions.groups, groupDetailVersion]);

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

  return {
    group,
    loadingGroup: !ready || loadingGroup,
    loadError,
    members,
    loadingMembers,
    isOwner,
    currentUserRole,
    currentUserId: userId,
    isInactive: group?.status === 'inactive',
    dateLabel: group ? formatOptionalDateRange(group.startDate, group.endDate) : '',
    totalSpentLabel: formatCAD(totalSpentCents),
    recentExpenses,
    setInactive,
    removeGroup,
    actionError,
    actionLoading,
    refreshMembers: loadMembers,
  };
}
