import { calculateTeamBalances, optimizeTransfers } from '../core/settlement';
import { getCachedUserId } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { mapSettlement } from '../lib/mappers';
import type { GroupMember, Settlement, SettlementMode } from '../types/models';
import type { GroupMemberWithProfile, GroupBalanceSummary, PendingTransferView, SettleUpView } from '../types/views';
import {
  resolveSettlementMember,
} from '../utils/settlementMember';
import { formatCAD } from '../utils/money';
import { createLogger } from '../utils/logger';
import { buildPaymentDetailsCopyText } from '../utils/paymentCopy';
import {
  findMemberForUser,
  getGroupMembers,
  getTeams,
  readDb,
} from './dbHelpers';
import { getAccessibleGroupsForUser } from './groupAccess';
import { isBalanceEligibleMember } from '../utils/groupParticipants';
import { SETTLEMENT_COLUMNS, SETTLEMENT_LIST_LIMIT } from '../lib/queryColumns';
import {
  USER_SETTLE_TEAM_ID,
  calculateGroupBalances,
  applyPaidSettlements,
  generateOptimizedTransfers,
  calculateIndividualPendingTransfersForCurrentUser,
  calculateTeamSettlementPreview,
  computeTeamCoveredBalances,
  buildMemberMap,
  toCoreMembers,
  buildTeamTransferView,
} from './settlements/settlementCalculations';
import {
  getSettlementHistory,
  getGlobalSettlementHistoryForCurrentUser,
} from './settlements/settlementHistoryService';
import {
  markSettlementAsPaid,
  markTransferAsPaid,
  markTeamTransferAsPaid,
  markTransferPaid,
  type MarkTeamTransferAsPaidInput,
} from './settlements/settlementMutationService';

export {
  USER_SETTLE_TEAM_ID,
  calculateGroupBalances,
  applyPaidSettlements,
  generateOptimizedTransfers,
  calculateIndividualPendingTransfersForCurrentUser,
  calculateTeamSettlementPreview,
  computeTeamCoveredBalances,
  getSettlementHistory,
  getGlobalSettlementHistoryForCurrentUser,
  markSettlementAsPaid,
  markTransferAsPaid,
  markTeamTransferAsPaid,
  markTransferPaid,
};

export type { MarkTeamTransferAsPaidInput };

function getCurrentUserId(): string {
  return getCachedUserId();
}

const logger = createLogger('settlementService');

export async function getSettlements(groupId?: string): Promise<Settlement[]> {
  logger.info('Fetch settlements started', { table: 'settlements', groupId });
  try {
    let query = supabase
      .from('settlements')
      .select(SETTLEMENT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(SETTLEMENT_LIST_LIMIT);
    if (groupId) {
      query = query.eq('group_id', groupId);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const settlements = (data ?? []).map(mapSettlement);
    logger.info('Fetch settlements succeeded', { table: 'settlements', count: settlements.length, groupId });
    return settlements;
  } catch (error) {
    logger.error('Fetch settlements failed', error, { table: 'settlements', groupId });
    throw error;
  }
}

export function getSettleableMembers(groupId: string, db = readDb()): GroupMember[] {
  return getGroupMembers(groupId, db).filter((member) => isBalanceEligibleMember(member));
}

export function getSettleableMembersWithProfiles(groupId: string, db = readDb()): GroupMemberWithProfile[] {
  return getSettleableMembers(groupId, db).map((member) => {
    const resolved = resolveSettlementMember(member, db.profiles);
    return {
      id: member.id,
      groupId: member.groupId,
      userId: member.userId,
      email: resolved.email,
      displayName: resolved.displayName,
      role: member.role,
      invitationStatus: member.invitationStatus,
      isActive: member.isActive,
      avatarUrl: resolved.avatarUrl,
      avatarLabel: resolved.avatarLabel,
      isRegistered: Boolean(member.userId),
    };
  });
}


export function createEmptySettleUpView(groupId: string, groupName = ''): SettleUpView {
  return {
    groupId,
    groupName,
    subtitle: 'Review your outgoing balances.',
    mode: 'individual',
    outgoingTransfers: [],
    settlementHistory: [],
  };
}


export function calculateTeamPendingTransfersForCurrentUser(
  groupId: string,
  selectedMemberIds: string[],
  userId: string = getCurrentUserId(),
): PendingTransferView[] {
  const preview = calculateTeamSettlementPreview(groupId, selectedMemberIds, userId);
  if (!preview) {
    logger.info('Current user outgoing transfers filtered', {
      groupId,
      mode: 'team',
      count: 0,
      teamSize: selectedMemberIds.length,
    });
    return [];
  }

  logger.info('Current user outgoing transfers filtered', {
    groupId,
    mode: 'team',
    count: 1,
    teamSize: preview.selectedMemberIds.length,
  });

  return [preview];
}

/** @deprecated Use calculateIndividualPendingTransfersForCurrentUser */
export function calculateIndividualSettlement(groupId: string): PendingTransferView[] {
  return calculateIndividualPendingTransfersForCurrentUser(groupId);
}

/** @deprecated Uses DB teams — prefer calculateTeamPendingTransfersForCurrentUser */
export function calculateTeamSettlement(groupId: string): PendingTransferView[] {
  const db = readDb();
  const members = toCoreMembers(groupId);
  const teams = getTeams(groupId, db).map((team) => ({
    id: team.id,
    name: team.name,
    receiverMemberId: team.receiverMemberId,
  }));
  const memberBalances = applyPaidSettlements(groupId, calculateGroupBalances(groupId));
  const teamBalances = calculateTeamBalances(
    members.map((member) => ({ id: member.id, displayName: member.displayName, teamId: member.teamId })),
    teams,
    memberBalances,
  );
  const transfers = optimizeTransfers(
    teamBalances.map((entry) => ({ id: entry.teamId, balanceCents: entry.balanceCents })),
  );
  const memberMap = buildMemberMap(groupId);
  const balanceMap = new Map(memberBalances.map((entry) => [entry.memberId, entry.balanceCents]));
  const teamMembers = new Map<string, string[]>();
  for (const member of members) {
    const teamId = member.teamId ?? `solo:${member.id}`;
    const list = teamMembers.get(teamId) ?? [];
    list.push(member.id);
    teamMembers.set(teamId, list);
  }

  return transfers.map((transfer, index) =>
    buildTeamTransferView(groupId, transfer, memberMap, teamMembers, balanceMap, index),
  );
}

export function getSettleUpView(
  groupId: string,
  mode: SettlementMode = 'individual',
  selectedMemberIds: string[] = [],
): SettleUpView {
  logger.info('Settlement calculation started', { groupId, mode });
  try {
    const db = readDb();
    const group = db.groups.find((entry) => entry.id === groupId);
    if (!group) {
      return createEmptySettleUpView(groupId);
    }

    const outgoingTransfers =
      mode === 'team'
        ? calculateTeamPendingTransfersForCurrentUser(groupId, selectedMemberIds)
        : calculateIndividualPendingTransfersForCurrentUser(groupId);
    const settlementHistory = getSettlementHistory(groupId);

    return {
      groupId,
      groupName: group.name,
      subtitle: 'Review your outgoing balances.',
      mode,
      outgoingTransfers,
      settlementHistory,
    };
  } catch (error) {
    logger.error('Calculate settlement failed', error, { groupId, mode });
    throw error;
  }
}

export function getDefaultSettleGroupId(userId: string = getCachedUserId()): string {
  const db = readDb();
  const owned = db.groups.find((group) => group.ownerId === userId);
  return owned?.id ?? db.groups[0]?.id ?? '';
}

export function getGlobalPendingTransfersForCurrentUser(
  userId: string = getCurrentUserId(),
): PendingTransferView[] {
  logger.info('Global pending transfers fetch started', { userId });

  const groups = getAccessibleGroupsForUser(userId);
  const transfers: PendingTransferView[] = [];

  for (const group of groups) {
    const outgoing = calculateIndividualPendingTransfersForCurrentUser(group.id, userId);
    transfers.push(...outgoing);
  }

  transfers.sort((a, b) => {
    const groupCompare = a.groupName.localeCompare(b.groupName);
    if (groupCompare !== 0) {
      return groupCompare;
    }
    return b.amountCents - a.amountCents;
  });

  logger.info('Global pending transfers fetch succeeded', { count: transfers.length });
  return transfers;
}

function buildBalanceStatusLabel(adjustedBalanceCents: number): Pick<GroupBalanceSummary, 'status' | 'label'> {
  if (adjustedBalanceCents === 0) {
    return { status: 'settled', label: 'Settled' };
  }
  if (adjustedBalanceCents > 0) {
    return { status: 'owed', label: `You are owed ${formatCAD(adjustedBalanceCents)}` };
  }
  return { status: 'owes', label: `You owe ${formatCAD(Math.abs(adjustedBalanceCents))}` };
}

export function getMemberRawBalanceCents(groupId: string, memberId: string): number {
  const balances = calculateGroupBalances(groupId);
  return balances.find((entry) => entry.memberId === memberId)?.balanceCents ?? 0;
}

export function getMemberAdjustedBalanceCents(groupId: string, memberId: string): number {
  const adjusted = applyPaidSettlements(groupId, calculateGroupBalances(groupId));
  return adjusted.find((entry) => entry.memberId === memberId)?.balanceCents ?? 0;
}

export function getCurrentUserGroupBalance(
  groupId: string,
  userId: string = getCachedUserId(),
): number {
  const member = findMemberForUser(groupId, userId);
  if (!member) {
    return 0;
  }
  return getMemberAdjustedBalanceCents(groupId, member.id);
}

export function getCurrentUserGroupBalanceSummary(
  groupId: string,
  userId: string = getCachedUserId(),
): GroupBalanceSummary {
  const member = findMemberForUser(groupId, userId);
  if (!member) {
    return {
      groupId,
      rawBalanceCents: 0,
      adjustedBalanceCents: 0,
      status: 'settled',
      label: 'Settled',
    };
  }

  const rawBalances = calculateGroupBalances(groupId);
  const rawBalanceCents = rawBalances.find((entry) => entry.memberId === member.id)?.balanceCents ?? 0;
  const adjustedBalances = applyPaidSettlements(groupId, rawBalances);
  const adjustedBalanceCents =
    adjustedBalances.find((entry) => entry.memberId === member.id)?.balanceCents ?? 0;
  const { status, label } = buildBalanceStatusLabel(adjustedBalanceCents);

  return {
    groupId,
    rawBalanceCents,
    adjustedBalanceCents,
    status,
    label,
  };
}

export function buildPaymentCopyText(transfer: PendingTransferView): string {
  return buildPaymentDetailsCopyText({
    recipientName: transfer.receiverName,
    recipientEmail: transfer.receiverTransferEmail ?? transfer.receiverEmail,
    recipientPhone: transfer.receiverEmtPhone,
    amountLabel: transfer.amountDisplay,
    message: transfer.paymentMessage,
  });
}

/** @deprecated Use buildPaymentCopyText */
export function buildEmtCopyText(transfer: PendingTransferView): string {
  return buildPaymentCopyText(transfer);
}
