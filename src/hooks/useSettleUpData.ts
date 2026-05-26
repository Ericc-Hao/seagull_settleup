import { useMemo } from 'react';

import { useAppData } from '../context/AppDataContext';
import { findMemberForUser } from '../services/dbHelpers';
import { getCurrentUserId, getGroupById } from '../services/groupService';
import {
  calculateIndividualPendingTransfersForCurrentUser,
  createEmptySettleUpView,
  getCurrentUserGroupBalanceSummary,
  getSettlementHistory,
  getSettleableMembersWithProfiles,
} from '../services/settlementService';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSettleUpData');

export function useSettleUpData(groupId: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { versions, ready, getGroupDetailVersion } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const group = useMemo(() => (enabled && groupId ? getGroupById(groupId) : undefined), [groupId, enabled, versions.groups, groupDetailVersion]);
  const currentMemberId = useMemo(() => {
    if (!enabled || !groupId || !ready) {
      return undefined;
    }
    return findMemberForUser(groupId, getCurrentUserId())?.id;
  }, [enabled, groupId, ready, versions.groups, groupDetailVersion]);

  const members = useMemo(() => {
    if (!enabled || !groupId || !ready) {
      return [];
    }
    return getSettleableMembersWithProfiles(groupId);
  }, [enabled, groupId, ready, versions.groups, groupDetailVersion]);

  const { outgoingTransfers, settlementHistory, showSettleTogether } = useMemo(() => {
    if (!enabled || !groupId || !ready || !group) {
      return {
        ...createEmptySettleUpView(groupId, group?.name ?? ''),
        showSettleTogether: false,
      };
    }

    logger.info('Group pending transfers fetch started', { groupId });

    try {
      const transfers = calculateIndividualPendingTransfersForCurrentUser(groupId);
      logger.info('Group pending transfers fetch succeeded', { groupId, count: transfers.length });

      logger.info('Group settlement history fetch started', { groupId });
      const history = getSettlementHistory(groupId);
      logger.info('Group settlement history fetch succeeded', { groupId, count: history.length });

      const balanceSummary = getCurrentUserGroupBalanceSummary(groupId);
      const hasUnsettledBalance = balanceSummary.adjustedBalanceCents < 0;

      return {
        ...createEmptySettleUpView(groupId, group.name),
        outgoingTransfers: transfers,
        settlementHistory: history,
        showSettleTogether: transfers.length > 0 || hasUnsettledBalance,
      };
    } catch (error) {
      logger.error('Pending transfers fetch failed', error, { groupId });
      return {
        ...createEmptySettleUpView(groupId, group.name),
        showSettleTogether: false,
      };
    }
  }, [enabled, groupId, ready, group, versions.settlements, versions.expenses, versions.groups, groupDetailVersion]);

  return {
    group,
    ready: enabled ? ready : true,
    members,
    currentMemberId,
    outgoingTransfers,
    settlementHistory,
    showSettleTogether,
  };
}
