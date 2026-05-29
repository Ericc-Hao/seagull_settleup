import { getCachedUserId } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { SettlementMode } from '../../types/models';
import type { PendingTransferView } from '../../types/views';
import { buildTeamDisplayLabel } from '../../utils/settlementMember';
import { createLogger } from '../../utils/logger';
import {
  applyPaidSettlements,
  buildMemberMap,
  buildTeamSettlementExplanation,
  calculateGroupBalances,
  computeTeamCoveredBalances,
  getCurrentMemberId,
  type SettlementTeamMeta,
} from './settlementCalculations';

function getCurrentUserId(): string {
  return getCachedUserId();
}

const logger = createLogger('settlementService');

export async function markSettlementAsPaid(settlementId: string): Promise<void> {
  const { error } = await supabase
    .from('settlements')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', settlementId);
  if (error) {
    throw error;
  }
}

export async function markTransferAsPaid(
  groupId: string,
  transfer: PendingTransferView,
): Promise<void> {
  logger.info('Mark as paid started', { table: 'settlements', groupId, mode: transfer.mode });
  try {
    const currentMemberId = getCurrentMemberId(groupId);
    if (!currentMemberId) {
      throw new Error('You must be a group member to mark a transfer as paid.');
    }

    const isOwnTransfer =
      transfer.mode === 'individual'
        ? transfer.fromMemberId === currentMemberId
        : transfer.fromMemberIds?.includes(currentMemberId);

    if (!isOwnTransfer) {
      throw new Error('You can only mark your own outgoing transfers as paid.');
    }

    const note =
      transfer.mode === 'team'
        ? JSON.stringify({
            fromMemberIds: transfer.fromMemberIds,
            toMemberIds: transfer.toMemberIds,
            fromLabel: transfer.fromLabel,
            toLabel: transfer.toLabel,
          })
        : null;

    const { error: settlementError } = await supabase.from('settlements').insert({
      group_id: groupId,
      mode: transfer.mode,
      from_member_id: currentMemberId,
      to_member_id: transfer.toMemberId ?? transfer.toMemberIds?.[0] ?? null,
      from_team_id: null,
      to_team_id: null,
      amount_cents: transfer.amountCents,
      currency: transfer.currency ?? 'CAD',
      status: 'paid',
      paid_at: new Date().toISOString(),
      note,
    });
    if (settlementError) {
      throw settlementError;
    }

    logger.info('Mark as paid succeeded', { table: 'settlements', groupId, mode: transfer.mode });
  } catch (error) {
    logger.error('Mark as paid failed', error, { table: 'settlements', groupId, mode: transfer.mode });
    throw error;
  }
}

export interface MarkTeamTransferAsPaidInput {
  groupId: string;
  transfer: PendingTransferView;
  selectedMemberIds: string[];
  selectedMemberNames: string[];
}

export async function markTeamTransferAsPaid(input: MarkTeamTransferAsPaidInput): Promise<void> {
  const { groupId, transfer, selectedMemberIds, selectedMemberNames } = input;
  logger.info('Team settlement marked paid started', {
    table: 'settlements',
    groupId,
    memberCount: selectedMemberIds.length,
  });

  try {
    const userId = getCurrentUserId();
    const currentMemberId = getCurrentMemberId(groupId, userId);
    if (!currentMemberId) {
      throw new Error('You must be a group member to mark a transfer as paid.');
    }

    const isZeroPayment = transfer.zeroPayment ?? transfer.amountCents === 0;

    if (!isZeroPayment && !transfer.fromMemberIds?.includes(currentMemberId)) {
      throw new Error('You can only mark your own outgoing team transfers as paid.');
    }

    const normalizedSelection = [...new Set([...selectedMemberIds, currentMemberId])];
    if (isZeroPayment && !normalizedSelection.includes(currentMemberId)) {
      throw new Error('You must be included in the team settlement.');
    }

    const memberMap = buildMemberMap(groupId);
    const paidByName = transfer.paidByName ?? memberMap.get(currentMemberId)?.displayName ?? 'Member';
    const coveredBalances =
      transfer.coveredBalances ??
      computeTeamCoveredBalances(
        normalizedSelection,
        memberMap,
        new Map(
          applyPaidSettlements(groupId, calculateGroupBalances(groupId)).map((entry) => [
            entry.memberId,
            entry.balanceCents,
          ]),
        ),
      ).coveredBalances;

    const explanation =
      transfer.explanation ??
      buildTeamSettlementExplanation(
        paidByName,
        selectedMemberNames,
        coveredBalances,
        transfer.amountCents,
        transfer.receiverName,
        transfer.teamBalanceCents ?? 0,
      );

    const fromMemberIds = isZeroPayment ? normalizedSelection : transfer.fromMemberIds ?? normalizedSelection;
    const fromLabel = isZeroPayment
      ? buildTeamDisplayLabel(fromMemberIds, memberMap)
      : transfer.fromLabel;

    const note = JSON.stringify({
      fromMemberIds,
      toMemberIds: transfer.toMemberIds,
      fromLabel,
      toLabel: transfer.toLabel,
    });

    const metadata: SettlementTeamMeta = {
      teamMemberIds: normalizedSelection,
      teamMemberNames: selectedMemberNames,
      settlementType: 'temporary_team',
      paidByUserId: userId,
      paidByMemberId: currentMemberId,
      paidByName,
      coveredBalances,
      explanation,
      zeroPayment: isZeroPayment,
      fromMemberIds,
      toMemberIds: transfer.toMemberIds,
      fromLabel,
      toLabel: transfer.toLabel,
    };

    const { error: settlementError } = await supabase.from('settlements').insert({
      group_id: groupId,
      mode: 'team',
      from_member_id: currentMemberId,
      to_member_id: isZeroPayment ? null : transfer.toMemberId ?? transfer.toMemberIds?.[0] ?? null,
      from_team_id: null,
      to_team_id: null,
      amount_cents: transfer.amountCents,
      currency: transfer.currency ?? 'CAD',
      status: 'paid',
      paid_at: new Date().toISOString(),
      note,
      metadata,
    });

    if (settlementError) {
      throw settlementError;
    }

    if (isZeroPayment) {
      logger.info('Zero-payment team settlement confirmed', { table: 'settlements', groupId });
    } else {
      logger.info('Paid team settlement confirmed', { table: 'settlements', groupId });
    }
    logger.info('Team settlement history created', { table: 'settlements', groupId, zeroPayment: isZeroPayment });
  } catch (error) {
    logger.error('Team settlement marked paid failed', error, { table: 'settlements', groupId });
    throw error;
  }
}

/** @deprecated Use markTransferAsPaid */
export async function markTransferPaid(
  groupId: string,
  transfer: PendingTransferView,
  _mode?: SettlementMode,
): Promise<void> {
  return markTransferAsPaid(groupId, transfer);
}
