import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import type { SettlementMode } from '../types/models';
import { findMemberForUser } from '../services/dbHelpers';
import { getCurrentUserId, getGroupById } from '../services/groupService';
import {
  createEmptySettleUpView,
  getSettleUpView,
  getSettlementHistory,
  getSettleableMembersWithProfiles,
} from '../services/settlementService';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSettleUpData');

export function useSettleUpData(groupId: string) {
  const { version, ready } = useAppData();
  const group = useMemo(() => getGroupById(groupId), [groupId, version]);
  const [mode, setMode] = useState<SettlementMode>('individual');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);

  const currentMemberId = useMemo(() => {
    if (!groupId) {
      return undefined;
    }
    return findMemberForUser(groupId, getCurrentUserId())?.id;
  }, [groupId, version]);

  const members = useMemo(() => {
    if (!groupId || !ready) {
      return [];
    }
    return getSettleableMembersWithProfiles(groupId);
  }, [groupId, ready, version]);

  useEffect(() => {
    if (!currentMemberId) {
      return;
    }
    setTeamMemberIds((current) =>
      current.includes(currentMemberId) ? current : [...current, currentMemberId],
    );
  }, [currentMemberId]);

  const setModeWithLog = useCallback((nextMode: SettlementMode) => {
    logger.info('Settlement mode changed', { groupId, mode: nextMode });
    setMode(nextMode);
  }, [groupId]);

  const teamValidationError = useMemo(() => {
    if (mode !== 'team') {
      return undefined;
    }
    if (teamMemberIds.length === 0) {
      return 'Select at least one member for team settlement.';
    }
    if (currentMemberId && !teamMemberIds.includes(currentMemberId)) {
      return 'Your team must include you.';
    }
    return undefined;
  }, [currentMemberId, mode, teamMemberIds]);

  const view = useMemo(() => {
    if (!groupId || !ready || !group) {
      return createEmptySettleUpView(groupId, group?.name ?? '');
    }
    if (mode === 'team' && teamValidationError) {
      return {
        ...createEmptySettleUpView(groupId, group.name),
        mode,
        settlementHistory: getSettlementHistory(groupId),
      };
    }
    return getSettleUpView(groupId, mode, teamMemberIds);
  }, [groupId, mode, teamMemberIds, teamValidationError, version, ready, group]);

  const toggleTeamMember = useCallback(
    (memberId: string) => {
      if (memberId === currentMemberId) {
        return;
      }
      setTeamMemberIds((current) => {
        const next = current.includes(memberId)
          ? current.filter((id) => id !== memberId)
          : [...current, memberId];
        logger.info('Team selection changed', { groupId, count: next.length });
        return next;
      });
    },
    [currentMemberId, groupId],
  );

  const selectMyself = useCallback(() => {
    if (!currentMemberId) {
      return;
    }
    logger.info('Team selection changed', { groupId, action: 'select_myself' });
    setTeamMemberIds([currentMemberId]);
  }, [currentMemberId, groupId]);

  const selectAllTeamMembers = useCallback(() => {
    logger.info('Team selection changed', { groupId, action: 'select_all' });
    setTeamMemberIds(members.map((member) => member.id));
  }, [groupId, members]);

  const clearTeamSelection = useCallback(() => {
    logger.info('Team selection changed', { groupId, action: 'clear' });
    setTeamMemberIds(currentMemberId ? [currentMemberId] : []);
  }, [currentMemberId, groupId]);

  return {
    group,
    ready,
    view,
    mode,
    setMode: setModeWithLog,
    members,
    currentMemberId,
    teamMemberIds,
    toggleTeamMember,
    selectMyself,
    selectAllTeamMembers,
    clearTeamSelection,
    teamValidationError,
    outgoingTransfers: view.outgoingTransfers,
    settlementHistory: view.settlementHistory,
  };
}
