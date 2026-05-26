import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import {
  calculateTeamSettlementPreview,
  getSettleableMembersWithProfiles,
  markTeamTransferAsPaid,
} from '../services/settlementService';
import type { TeamSettlementPreviewView } from '../types/views';
import { createLogger } from '../utils/logger';

const logger = createLogger('useTeamSettlement');

export function useTeamSettlement(groupId: string, currentMemberId?: string) {
  const { versions, getGroupDetailVersion } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);

  const [selectionVisible, setSelectionVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [previewTransfer, setPreviewTransfer] = useState<TeamSettlementPreviewView | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const members = useMemo(
    () => getSettleableMembersWithProfiles(groupId),
    [groupId, versions.groups, groupDetailVersion, versions.settlements],
  );

  useEffect(() => {
    if (!currentMemberId) {
      return;
    }
    setSelectedMemberIds((current) =>
      current.includes(currentMemberId) ? current : [currentMemberId, ...current],
    );
  }, [currentMemberId]);

  const validationError = useMemo(() => {
    if (selectedMemberIds.length === 0) {
      return 'Select at least one member for team settlement.';
    }
    if (currentMemberId && !selectedMemberIds.includes(currentMemberId)) {
      return 'Your team must include you.';
    }
    return undefined;
  }, [currentMemberId, selectedMemberIds]);

  const selectedMemberNames = useMemo(
    () =>
      selectedMemberIds
        .map((memberId) => members.find((member) => member.id === memberId)?.displayName)
        .filter((name): name is string => Boolean(name?.trim())),
    [members, selectedMemberIds],
  );

  const openSelection = useCallback(() => {
    logger.info('Settle together opened', { groupId });
    setStep('select');
    setPreviewTransfer(null);
    setSelectionVisible(true);
  }, [groupId]);

  const closeSelection = useCallback(() => {
    setSelectionVisible(false);
    setStep('select');
    setPreviewTransfer(null);
  }, []);

  const toggleMember = useCallback(
    (memberId: string) => {
      if (memberId === currentMemberId) {
        return;
      }
      setSelectedMemberIds((current) => {
        const next = current.includes(memberId)
          ? current.filter((id) => id !== memberId)
          : [...current, memberId];
        logger.info('Team members selected', { groupId, count: next.length });
        return next;
      });
    },
    [currentMemberId, groupId],
  );

  const selectMyself = useCallback(() => {
    if (!currentMemberId) {
      return;
    }
    logger.info('Team members selected', { groupId, action: 'select_myself' });
    setSelectedMemberIds([currentMemberId]);
  }, [currentMemberId, groupId]);

  const selectAll = useCallback(() => {
    logger.info('Team members selected', { groupId, action: 'select_all' });
    setSelectedMemberIds(members.map((member) => member.id));
  }, [groupId, members]);

  const clearSelection = useCallback(() => {
    logger.info('Team members selected', { groupId, action: 'clear' });
    setSelectedMemberIds(currentMemberId ? [currentMemberId] : []);
  }, [currentMemberId, groupId]);

  const reviewTeamSettlement = useCallback(() => {
    if (validationError) {
      return;
    }
    setReviewing(true);
    logger.info('Team settlement preview calculated started', { groupId, memberCount: selectedMemberIds.length });
    try {
      const preview = calculateTeamSettlementPreview(groupId, selectedMemberIds);
      setPreviewTransfer(preview);
      logger.info('Team settlement preview calculated', {
        groupId,
        hasTransfer: Boolean(preview),
        amountCents: preview?.amountCents,
        requiresPayment: preview?.requiresPayment,
      });
      setStep('preview');
    } finally {
      setReviewing(false);
    }
  }, [groupId, selectedMemberIds, validationError, versions.settlements, groupDetailVersion]);

  const openConfirm = useCallback(() => {
    if (!previewTransfer) {
      return;
    }
    logger.info('Team settlement confirmation opened', { groupId });
    setSelectionVisible(false);
    setConfirmVisible(true);
  }, [groupId, previewTransfer]);

  const cancelConfirm = useCallback(() => {
    setConfirmVisible(false);
    setSelectionVisible(true);
    setStep('preview');
  }, []);

  const confirmTeamSettlement = useCallback(
    async (refresh: () => Promise<void>) => {
      if (!previewTransfer) {
        return;
      }
      setConfirming(true);
      const isZeroPayment = previewTransfer.zeroPayment ?? previewTransfer.amountCents === 0;
      logger.info('Team settlement confirmation started', { groupId, zeroPayment: isZeroPayment });
      try {
        await markTeamTransferAsPaid({
          groupId,
          transfer: previewTransfer,
          selectedMemberIds,
          selectedMemberNames,
        });
        if (isZeroPayment) {
          logger.info('Zero-payment team settlement confirmed', { groupId });
        } else {
          logger.info('Paid team settlement confirmed', { groupId });
        }
        setConfirmVisible(false);
        setSelectionVisible(false);
        setPreviewTransfer(null);
        setStep('select');
        await refresh();
      } catch (error) {
        logger.error('Team settlement marked paid failed', error, { groupId });
        throw error;
      } finally {
        setConfirming(false);
      }
    },
    [groupId, previewTransfer, selectedMemberIds, selectedMemberNames],
  );

  return {
    members,
    selectionVisible,
    confirmVisible,
    step,
    selectedMemberIds,
    previewTransfer,
    selectedMemberNames,
    validationError,
    reviewing,
    confirming,
    openSelection,
    closeSelection,
    toggleMember,
    selectMyself,
    selectAll,
    clearSelection,
    reviewTeamSettlement,
    openConfirm,
    cancelConfirm,
    confirmTeamSettlement,
    setStep,
  };
}
