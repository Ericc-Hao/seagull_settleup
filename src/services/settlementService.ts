import {
  calculateMemberBalances,
  calculateTeamBalances,
  optimizeTransfers,
} from '../core/settlement';
import type { MemberBalance } from '../core/settlement/types';
import { supabase } from '../lib/supabase';
import { mapSettlement } from '../lib/mappers';
import type { GroupMember, Settlement, SettlementMode } from '../types/models';
import type { GroupMemberWithProfile, GroupBalanceSummary, PendingTransferView, SettleUpView, SettlementHistoryItemView, TeamSettlementPreviewView, CoveredBalanceView } from '../types/views';
import { formatDateForDisplay } from '../utils/date';
import {
  buildMemberDisplayLabel,
  buildTeamDisplayLabel,
  resolveSettlementMember,
  type SettlementMemberInfo,
} from '../utils/settlementMember';
import { formatCAD } from '../utils/money';
import { createLogger } from '../utils/logger';
import { buildPaymentMessage, buildPaymentDetailsCopyText } from '../utils/paymentCopy';
import {
  findMemberForUser,
  getExpenseSplits,
  getGroupExpenses,
  getGroupMembers,
  getGroupOrThrow,
  getMemberTeamId,
  getTeams,
  readDb,
} from './dbHelpers';
import { getCachedUserId } from '../lib/auth';
import { SETTLEMENT_COLUMNS, SETTLEMENT_LIST_LIMIT } from '../lib/queryColumns';

function getCurrentUserId(): string {
  return getCachedUserId();
}

const logger = createLogger('settlementService');

export const USER_SETTLE_TEAM_ID = 'settle-team:user';

interface CoreMember {
  id: string;
  displayName: string;
  teamId?: string;
}

interface CoreExpense {
  id: string;
  payerMemberId: string;
  amountCents: number;
  splits: { memberId: string; shareAmountCents: number }[];
}

interface CoveredBalanceRecord {
  memberId: string;
  memberName: string;
  balanceBeforeCents: number;
  coveredAmountCents: number;
  role: 'debtor' | 'creditor' | 'offset';
}

interface SettlementTeamMeta {
  fromMemberIds?: string[];
  toMemberIds?: string[];
  fromLabel?: string;
  toLabel?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  settlementType?: string;
  paidByUserId?: string;
  paidByMemberId?: string;
  paidByName?: string;
  coveredBalances?: CoveredBalanceRecord[];
  explanation?: string;
  zeroPayment?: boolean;
}

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
  return getGroupMembers(groupId, db).filter((member) => {
    if (member.isActive === false) {
      return false;
    }
    if (
      member.invitationStatus === 'pending' ||
      member.invitationStatus === 'declined' ||
      member.invitationStatus === 'removed'
    ) {
      return false;
    }
    return true;
  });
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

function buildMemberMap(groupId: string, db = readDb()): Map<string, SettlementMemberInfo> {
  const map = new Map<string, SettlementMemberInfo>();
  for (const member of getSettleableMembers(groupId, db)) {
    map.set(member.id, resolveSettlementMember(member, db.profiles));
  }
  return map;
}

function formatPaidDateLabel(isoDate: string): string {
  return formatDateForDisplay(new Date(isoDate));
}

function receiverFieldsFromMember(info: SettlementMemberInfo): Pick<
  PendingTransferView,
  | 'receiverName'
  | 'receiverEmail'
  | 'receiverTransferEmail'
  | 'receiverEmtPhone'
  | 'receiverAvatarUrl'
  | 'receiverAvatarLabel'
> {
  return {
    receiverName: info.displayName,
    receiverEmail: info.email,
    receiverTransferEmail: info.transferEmail,
    receiverEmtPhone: info.emtPhone,
    receiverAvatarUrl: info.avatarUrl,
    receiverAvatarLabel: info.avatarLabel,
  };
}

function toCoreMembers(groupId: string): CoreMember[] {
  const db = readDb();
  return getSettleableMembers(groupId, db).map((member) => ({
    id: member.id,
    displayName: member.displayName,
    teamId: getMemberTeamId(member.id, groupId, db),
  }));
}

function toCoreExpenses(groupId: string): CoreExpense[] {
  const db = readDb();
  const memberIds = new Set(getSettleableMembers(groupId, db).map((member) => member.id));

  return getGroupExpenses(groupId, db).flatMap((expense) => {
    if (!expense.payerMemberId || !memberIds.has(expense.payerMemberId)) {
      return [];
    }

    const splits = getExpenseSplits(expense.id, db)
      .filter((split) => memberIds.has(split.memberId))
      .map((split) => ({
        memberId: split.memberId,
        shareAmountCents: split.shareAmountCents,
      }));

    if (splits.length === 0) {
      return [];
    }

    const splitTotal = splits.reduce((sum, split) => sum + split.shareAmountCents, 0);
    if (splitTotal !== expense.amountCents) {
      return [];
    }

    return [
      {
        id: expense.id,
        payerMemberId: expense.payerMemberId,
        amountCents: expense.amountCents,
        splits,
      },
    ];
  });
}

function parseSettlementMeta(settlement: Settlement): SettlementTeamMeta | null {
  const metadata = settlement.metadata;
  if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
    return metadata as SettlementTeamMeta;
  }
  if (!settlement.note) {
    return null;
  }
  try {
    return JSON.parse(settlement.note) as SettlementTeamMeta;
  } catch {
    return null;
  }
}

function distributeAmountByWeight(
  memberIds: string[],
  amountCents: number,
  weights: Map<string, number>,
): Map<string, number> {
  const allocations = new Map<string, number>();
  if (memberIds.length === 0 || amountCents <= 0) {
    return allocations;
  }

  const totalWeight = memberIds.reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
  if (totalWeight <= 0) {
    const base = Math.floor(amountCents / memberIds.length);
    let remainder = amountCents - base * memberIds.length;
    for (const id of memberIds) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) {
        remainder -= 1;
      }
      allocations.set(id, base + extra);
    }
    return allocations;
  }

  let assigned = 0;
  const shares = memberIds.map((id) => {
    const weight = weights.get(id) ?? 0;
    const raw = (amountCents * weight) / totalWeight;
    const floored = Math.floor(raw);
    assigned += floored;
    return { id, floored, fraction: raw - floored };
  });

  let remainder = amountCents - assigned;
  shares.sort((a, b) => b.fraction - a.fraction);
  for (const share of shares) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) {
      remainder -= 1;
    }
    allocations.set(share.id, share.floored + extra);
  }

  return allocations;
}

function applyPaidSettlementToBalances(
  balances: Map<string, number>,
  settlement: Settlement,
  db: ReturnType<typeof readDb>,
): void {
  if (settlement.mode === 'individual') {
    if (!settlement.fromMemberId || !settlement.toMemberId) {
      return;
    }
    balances.set(
      settlement.fromMemberId,
      (balances.get(settlement.fromMemberId) ?? 0) + settlement.amountCents,
    );
    balances.set(
      settlement.toMemberId,
      (balances.get(settlement.toMemberId) ?? 0) - settlement.amountCents,
    );
    return;
  }

  const meta = parseSettlementMeta(settlement);

  if (settlement.mode === 'team' && (meta?.zeroPayment === true || settlement.amountCents === 0)) {
    logger.info('Apply zero-payment team settlement skipped balance changes', {
      settlementId: settlement.id,
    });
    return;
  }

  if (meta?.coveredBalances && meta.coveredBalances.length > 0) {
    logger.info('Apply paid team settlement started', {
      settlementId: settlement.id,
      coveredCount: meta.coveredBalances.length,
    });

    for (const covered of meta.coveredBalances) {
      if (covered.coveredAmountCents <= 0) {
        continue;
      }
      if (covered.role === 'debtor') {
        balances.set(
          covered.memberId,
          (balances.get(covered.memberId) ?? 0) + covered.coveredAmountCents,
        );
      } else if (covered.role === 'creditor' || covered.role === 'offset') {
        balances.set(
          covered.memberId,
          (balances.get(covered.memberId) ?? 0) - covered.coveredAmountCents,
        );
      }
    }

    if (settlement.toMemberId) {
      balances.set(
        settlement.toMemberId,
        (balances.get(settlement.toMemberId) ?? 0) - settlement.amountCents,
      );
    }

    logger.info('Apply paid team settlement succeeded', { settlementId: settlement.id });
    return;
  }

  let fromMemberIds = meta?.teamMemberIds ?? meta?.fromMemberIds ?? [];
  let toMemberIds = meta?.toMemberIds ?? [];

  if (fromMemberIds.length === 0 && settlement.fromTeamId) {
    fromMemberIds = db.teamMembers
      .filter((link) => link.teamId === settlement.fromTeamId)
      .map((link) => link.memberId);
  }
  if (toMemberIds.length === 0 && settlement.toTeamId) {
    toMemberIds = db.teamMembers
      .filter((link) => link.teamId === settlement.toTeamId)
      .map((link) => link.memberId);
  }
  if (fromMemberIds.length === 0 && settlement.fromMemberId) {
    fromMemberIds = [settlement.fromMemberId];
  }
  if (toMemberIds.length === 0 && settlement.toMemberId) {
    toMemberIds = [settlement.toMemberId];
  }

  const debtorWeights = new Map<string, number>();
  for (const memberId of fromMemberIds) {
    const balance = balances.get(memberId) ?? 0;
    debtorWeights.set(memberId, balance < 0 ? Math.abs(balance) : 0);
  }
  for (const [memberId, share] of distributeAmountByWeight(
    fromMemberIds,
    settlement.amountCents,
    debtorWeights,
  )) {
    balances.set(memberId, (balances.get(memberId) ?? 0) + share);
  }

  const creditorWeights = new Map<string, number>();
  for (const memberId of toMemberIds) {
    const balance = balances.get(memberId) ?? 0;
    creditorWeights.set(memberId, balance > 0 ? balance : 0);
  }
  for (const [memberId, share] of distributeAmountByWeight(
    toMemberIds,
    settlement.amountCents,
    creditorWeights,
  )) {
    balances.set(memberId, (balances.get(memberId) ?? 0) - share);
  }
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

export function calculateGroupBalances(groupId: string): MemberBalance[] {
  logger.info('Settlement calculation started', { groupId });
  try {
    const members = toCoreMembers(groupId);
    const expenses = toCoreExpenses(groupId);
    const balances = calculateMemberBalances(
      members.map((member) => ({ id: member.id, displayName: member.displayName, teamId: member.teamId })),
      expenses,
    );
    logger.info('Raw balances calculated', {
      groupId,
      memberCount: members.length,
      expenseCount: expenses.length,
    });
    return balances;
  } catch (error) {
    logger.error('Calculate balances failed', error, { groupId });
    throw error;
  }
}

export function applyPaidSettlements(
  groupId: string,
  balances: MemberBalance[],
): MemberBalance[] {
  const db = readDb();
  const paidSettlements = db.settlements.filter(
    (settlement) => settlement.groupId === groupId && settlement.status === 'paid',
  );
  const balanceMap = new Map(balances.map((entry) => [entry.memberId, entry.balanceCents]));

  for (const settlement of paidSettlements) {
    applyPaidSettlementToBalances(balanceMap, settlement, db);
  }

  logger.info('Paid settlements applied', {
    groupId,
    paidCount: paidSettlements.length,
  });

  return balances.map((entry) => ({
    ...entry,
    balanceCents: balanceMap.get(entry.memberId) ?? entry.balanceCents,
  }));
}

export function generateOptimizedTransfers(
  adjustedBalances: MemberBalance[],
): { fromId: string; toId: string; amountCents: number }[] {
  const transfers = optimizeTransfers(
    adjustedBalances.map((entry) => ({ id: entry.memberId, balanceCents: entry.balanceCents })),
  );
  logger.info('Optimized transfers generated', { transferCount: transfers.length });
  return transfers;
}

function pickReceiverMemberInfo(
  memberIds: string[],
  memberMap: Map<string, SettlementMemberInfo>,
  balances: Map<string, number>,
): SettlementMemberInfo | undefined {
  const sorted = [...memberIds].sort((a, b) => (balances.get(b) ?? 0) - (balances.get(a) ?? 0));
  for (const memberId of sorted) {
    const info = memberMap.get(memberId);
    if (info) {
      return info;
    }
  }
  return memberIds[0] ? memberMap.get(memberIds[0]) : undefined;
}

function buildIndividualTransferView(
  groupId: string,
  transfer: { fromId: string; toId: string; amountCents: number },
  memberMap: Map<string, SettlementMemberInfo>,
  index: number,
): PendingTransferView {
  const db = readDb();
  const group = getGroupOrThrow(groupId, db);
  const receiver = memberMap.get(transfer.toId);
  const fromLabel = buildMemberDisplayLabel(transfer.fromId, memberMap);
  const receiverName = receiver?.displayName ?? buildMemberDisplayLabel(transfer.toId, memberMap);

  return {
    id: `transfer-${groupId}-ind-${transfer.fromId}-${transfer.toId}-${index}`,
    groupId,
    mode: 'individual',
    fromMemberId: transfer.fromId,
    toMemberId: transfer.toId,
    fromMemberIds: [transfer.fromId],
    toMemberIds: [transfer.toId],
    fromLabel,
    toLabel: receiverName,
    amountCents: transfer.amountCents,
    amountDisplay: formatCAD(transfer.amountCents, { includeSuffix: true }),
    currency: 'CAD',
    ...(receiver ? receiverFieldsFromMember(receiver) : {
      receiverName,
    }),
    groupName: group.name,
    paymentMessage: buildPaymentMessage({
      groupName: group.name,
      payerName: fromLabel,
      receiverName,
    }),
    status: 'pending',
  };
}

function buildTeamTransferView(
  groupId: string,
  transfer: { fromId: string; toId: string; amountCents: number },
  memberMap: Map<string, SettlementMemberInfo>,
  teamMembers: Map<string, string[]>,
  balanceMap: Map<string, number>,
  index: number,
): PendingTransferView {
  const db = readDb();
  const group = getGroupOrThrow(groupId, db);
  const fromMemberIds = teamMembers.get(transfer.fromId) ?? [];
  const toMemberIds = teamMembers.get(transfer.toId) ?? [];
  const receiver = pickReceiverMemberInfo(toMemberIds, memberMap, balanceMap);

  const fromLabel = buildTeamDisplayLabel(fromMemberIds, memberMap);
  const toLabel = buildTeamDisplayLabel(toMemberIds, memberMap);
  const receiverName = receiver?.displayName ?? toLabel;

  return {
    id: `transfer-${groupId}-team-${transfer.fromId}-${transfer.toId}-${index}`,
    groupId,
    mode: 'team',
    fromMemberId: fromMemberIds[0],
    toMemberId: toMemberIds[0],
    fromMemberIds,
    toMemberIds,
    fromLabel,
    toLabel,
    amountCents: transfer.amountCents,
    amountDisplay: formatCAD(transfer.amountCents, { includeSuffix: true }),
    currency: 'CAD',
    ...(receiver ? receiverFieldsFromMember(receiver) : {
      receiverName,
    }),
    groupName: group.name,
    paymentMessage: buildPaymentMessage({
      groupName: group.name,
      payerName: fromLabel,
      receiverName,
    }),
    status: 'pending',
  };
}

function getCurrentMemberId(groupId: string, userId: string = getCurrentUserId()): string | undefined {
  return findMemberForUser(groupId, userId)?.id;
}

export function calculateIndividualPendingTransfersForCurrentUser(
  groupId: string,
  userId: string = getCurrentUserId(),
): PendingTransferView[] {
  const currentMemberId = getCurrentMemberId(groupId, userId);
  if (!currentMemberId) {
    logger.warn('Current user outgoing transfers filtered — no membership', { groupId, userId });
    return [];
  }

  const memberMap = buildMemberMap(groupId);
  const rawBalances = calculateGroupBalances(groupId);
  const adjustedBalances = applyPaidSettlements(groupId, rawBalances);
  const transfers = generateOptimizedTransfers(adjustedBalances);

  const outgoing = transfers
    .filter((transfer) => transfer.fromId === currentMemberId)
    .map((transfer, index) => buildIndividualTransferView(groupId, transfer, memberMap, index));

  logger.info('Current user outgoing transfers filtered', {
    groupId,
    mode: 'individual',
    count: outgoing.length,
  });

  return outgoing;
}

function buildTemporaryTeamMapping(
  members: CoreMember[],
  selectedMemberIds: string[],
  currentMemberId: string,
): { memberToTeam: Map<string, string>; teamMembers: Map<string, string[]> } {
  const selected = new Set(selectedMemberIds);
  selected.add(currentMemberId);

  const memberToTeam = new Map<string, string>();
  const teamMembers = new Map<string, string[]>();

  for (const member of members) {
    const teamId = selected.has(member.id) ? USER_SETTLE_TEAM_ID : `solo:${member.id}`;
    memberToTeam.set(member.id, teamId);
    const list = teamMembers.get(teamId) ?? [];
    list.push(member.id);
    teamMembers.set(teamId, list);
  }

  return { memberToTeam, teamMembers };
}

function calculateVirtualTeamBalances(
  memberBalances: MemberBalance[],
  memberToTeam: Map<string, string>,
): { id: string; balanceCents: number }[] {
  const teamBalanceMap = new Map<string, number>();
  for (const balance of memberBalances) {
    const teamId = memberToTeam.get(balance.memberId) ?? `solo:${balance.memberId}`;
    teamBalanceMap.set(teamId, (teamBalanceMap.get(teamId) ?? 0) + balance.balanceCents);
  }
  return Array.from(teamBalanceMap.entries()).map(([id, balanceCents]) => ({ id, balanceCents }));
}

export function computeTeamCoveredBalances(
  selectedMemberIds: string[],
  memberMap: Map<string, SettlementMemberInfo>,
  balancesBefore: Map<string, number>,
): { coveredBalances: CoveredBalanceView[]; teamBalanceCents: number } {
  const teamBalanceCents = selectedMemberIds.reduce(
    (sum, memberId) => sum + (balancesBefore.get(memberId) ?? 0),
    0,
  );

  const coveredBalances: CoveredBalanceView[] = selectedMemberIds.map((memberId) => {
    const balanceBeforeCents = balancesBefore.get(memberId) ?? 0;
    const memberName = memberMap.get(memberId)?.displayName ?? 'Member';

    if (balanceBeforeCents < 0) {
      return {
        memberId,
        memberName,
        balanceBeforeCents,
        coveredAmountCents: Math.abs(balanceBeforeCents),
        role: 'debtor' as const,
      };
    }

    if (balanceBeforeCents > 0) {
      return {
        memberId,
        memberName,
        balanceBeforeCents,
        coveredAmountCents: balanceBeforeCents,
        role: 'creditor' as const,
      };
    }

    return {
      memberId,
      memberName,
      balanceBeforeCents: 0,
      coveredAmountCents: 0,
      role: 'offset' as const,
    };
  });

  logger.info('Covered balances generated', {
    count: coveredBalances.length,
    teamBalanceCents,
  });

  return { coveredBalances, teamBalanceCents };
}

function buildTeamSettlementExplanation(
  paidByName: string,
  selectedMemberNames: string[],
  coveredBalances: CoveredBalanceView[],
  amountCents: number,
  receiverName: string,
  teamBalanceCents: number,
): string {
  const teamLabel = selectedMemberNames.join(' and ');
  const amountDisplay = formatCAD(amountCents, { includeSuffix: true });

  if (amountCents > 0) {
    const coveredDebtors = coveredBalances.filter(
      (entry) => entry.role === 'debtor' && entry.coveredAmountCents > 0 && entry.memberName !== paidByName,
    );
    let explanation = `${paidByName} will pay ${amountDisplay} on behalf of ${teamLabel}.`;
    if (coveredDebtors.length > 0) {
      const names = coveredDebtors.map((entry) => entry.memberName).join(' and ');
      explanation += ` This includes ${names}'s pending balance, so they will not need to settle this amount separately.`;
    }
    if (teamBalanceCents < 0 && coveredBalances.some((entry) => entry.role === 'creditor')) {
      explanation += ` This combines receivables and debts within the selected team.`;
    }
    explanation += ` Payment goes to ${receiverName}.`;
    return explanation;
  }

  if (teamBalanceCents === 0) {
    return `${teamLabel} are settled together for this group. Confirming will record this team settlement.`;
  }

  if (teamBalanceCents > 0) {
    return `${teamLabel} are already balanced together. Confirming will record that this team settlement is complete.`;
  }

  return `${teamLabel} team settlement confirmation.`;
}

function buildTeamPaymentMessage(
  groupName: string,
  teamMemberNames: string[],
  recipientName: string,
): string {
  const teamLabel = teamMemberNames.join(' + ');
  return `${groupName} team settlement - ${teamLabel} to ${recipientName}`;
}

function buildZeroTeamSettlementPreview(
  groupId: string,
  normalizedSelection: string[],
  selectedMemberNames: string[],
  coveredBalances: CoveredBalanceView[],
  teamBalanceCents: number,
  explanation: string,
  paidByName: string,
  currentMemberId: string,
  userId: string,
  memberMap: Map<string, SettlementMemberInfo>,
): TeamSettlementPreviewView {
  const db = readDb();
  const group = getGroupOrThrow(groupId, db);
  const fromLabel = buildTeamDisplayLabel(normalizedSelection, memberMap);

  return {
    id: `transfer-${groupId}-team-zero-${normalizedSelection.join('-')}`,
    groupId,
    mode: 'team',
    fromMemberId: currentMemberId,
    fromMemberIds: normalizedSelection,
    toMemberIds: [],
    fromLabel,
    toLabel: '',
    amountCents: 0,
    amountDisplay: formatCAD(0, { includeSuffix: true }),
    currency: 'CAD',
    receiverName: '',
    groupName: group.name,
    paymentMessage: '',
    status: 'pending',
    teamBalanceCents,
    selectedMemberIds: normalizedSelection,
    selectedMemberNames,
    coveredBalances,
    explanation,
    paidByName,
    paidByMemberId: currentMemberId,
    paidByUserId: userId,
    requiresPayment: false,
    zeroPayment: true,
  };
}

export function calculateTeamSettlementPreview(
  groupId: string,
  selectedMemberIds: string[],
  userId: string = getCurrentUserId(),
): TeamSettlementPreviewView | null {
  logger.info('Team settlement preview started', { groupId, memberCount: selectedMemberIds.length });

  const currentMemberId = getCurrentMemberId(groupId, userId);
  if (!currentMemberId) {
    return null;
  }

  const normalizedSelection = [...new Set([...selectedMemberIds, currentMemberId])];
  const members = toCoreMembers(groupId);
  const memberMap = buildMemberMap(groupId);
  const rawBalances = calculateGroupBalances(groupId);
  const adjustedBalances = applyPaidSettlements(groupId, rawBalances);
  const balanceMap = new Map(adjustedBalances.map((entry) => [entry.memberId, entry.balanceCents]));

  const { coveredBalances, teamBalanceCents } = computeTeamCoveredBalances(
    normalizedSelection,
    memberMap,
    balanceMap,
  );

  const selectedMemberNames = normalizedSelection.map(
    (memberId) => memberMap.get(memberId)?.displayName ?? 'Member',
  );
  const paidByName = memberMap.get(currentMemberId)?.displayName ?? 'Member';
  const db = readDb();
  const group = getGroupOrThrow(groupId, db);

  let paymentTransfer: PendingTransferView | null = null;

  if (teamBalanceCents < 0) {
    const { memberToTeam, teamMembers } = buildTemporaryTeamMapping(
      members,
      normalizedSelection,
      currentMemberId,
    );
    const teamBalanceEntries = calculateVirtualTeamBalances(adjustedBalances, memberToTeam);
    const transfers = optimizeTransfers(teamBalanceEntries);

    const outgoing = transfers
      .filter((transfer) => transfer.fromId === USER_SETTLE_TEAM_ID)
      .map((transfer, index) =>
        buildTeamTransferView(groupId, transfer, memberMap, teamMembers, balanceMap, index),
      );

    paymentTransfer = outgoing[0] ?? null;
  }

  const amountCents = paymentTransfer?.amountCents ?? 0;
  const requiresPayment = amountCents > 0;
  const zeroPayment = !requiresPayment;

  logger.info('Team settlement requires payment', { groupId, requiresPayment, teamBalanceCents });

  if (zeroPayment) {
    const explanation = buildTeamSettlementExplanation(
      paidByName,
      selectedMemberNames,
      coveredBalances,
      0,
      '',
      teamBalanceCents,
    );

    logger.info('Team settlement preview succeeded', {
      groupId,
      hasTransfer: false,
      teamBalanceCents,
      requiresPayment: false,
    });

    return buildZeroTeamSettlementPreview(
      groupId,
      normalizedSelection,
      selectedMemberNames,
      coveredBalances,
      teamBalanceCents,
      explanation,
      paidByName,
      currentMemberId,
      userId,
      memberMap,
    );
  }

  if (!paymentTransfer) {
    logger.info('Team settlement preview succeeded', { groupId, hasTransfer: false, teamBalanceCents });
    return null;
  }

  const explanation = buildTeamSettlementExplanation(
    paidByName,
    selectedMemberNames,
    coveredBalances,
    paymentTransfer.amountCents,
    paymentTransfer.receiverName,
    teamBalanceCents,
  );

  const paymentMessage = buildTeamPaymentMessage(
    group.name,
    selectedMemberNames,
    paymentTransfer.receiverName,
  );

  logger.info('Team settlement preview succeeded', {
    groupId,
    hasTransfer: true,
    amountCents: paymentTransfer.amountCents,
    teamBalanceCents,
    requiresPayment: true,
  });

  return {
    ...paymentTransfer,
    paymentMessage,
    teamBalanceCents,
    selectedMemberIds: normalizedSelection,
    selectedMemberNames,
    coveredBalances,
    explanation,
    paidByName,
    paidByMemberId: currentMemberId,
    paidByUserId: userId,
    requiresPayment: true,
    zeroPayment: false,
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

export function getDefaultSettleGroupId(userId: string = getCachedUserId()): string {
  const db = readDb();
  const owned = db.groups.find((group) => group.ownerId === userId);
  return owned?.id ?? db.groups[0]?.id ?? '';
}

export function getSettlementHistory(groupId: string): SettlementHistoryItemView[] {
  logger.info('Settlement history fetch started', { groupId });
  const db = readDb();
  const groupName = getGroupOrThrow(groupId, db).name;
  const memberMap = buildMemberMap(groupId, db);

  const history = db.settlements
    .filter((settlement) => settlement.groupId === groupId && settlement.status === 'paid')
    .sort(
      (a, b) =>
        new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime(),
    )
    .map((settlement) => {
      const meta = parseSettlementMeta(settlement);
      const paidAt = settlement.paidAt ?? settlement.createdAt;
      const amountDisplay = formatCAD(settlement.amountCents, { includeSuffix: true });

      if (settlement.mode === 'team') {
        const fromMemberIds =
          meta?.teamMemberIds ??
          meta?.fromMemberIds ??
          (settlement.fromTeamId
            ? db.teamMembers
                .filter((link) => link.teamId === settlement.fromTeamId)
                .map((link) => link.memberId)
            : settlement.fromMemberId
              ? [settlement.fromMemberId]
              : []);
        const toMemberIds =
          meta?.toMemberIds ??
          (settlement.toTeamId
            ? db.teamMembers
                .filter((link) => link.teamId === settlement.toTeamId)
                .map((link) => link.memberId)
            : settlement.toMemberId
              ? [settlement.toMemberId]
              : []);
        const fromLabel = meta?.fromLabel ?? buildTeamDisplayLabel(fromMemberIds, memberMap);
        const toLabel = meta?.toLabel ?? buildTeamDisplayLabel(toMemberIds, memberMap);
        const teamMemberNames =
          meta?.teamMemberNames ??
          fromMemberIds
            .map((memberId) => memberMap.get(memberId)?.displayName)
            .filter((name): name is string => Boolean(name?.trim()));
        const teamLabel =
          teamMemberNames.length > 0 ? teamMemberNames.join(' + ') : fromLabel;
        const receiver =
          (settlement.toMemberId ? memberMap.get(settlement.toMemberId) : undefined) ??
          (toMemberIds[0] ? memberMap.get(toMemberIds[0]) : undefined);
        const receiverName = receiver?.displayName ?? toLabel;
        const paidByName =
          meta?.paidByName ??
          (settlement.fromMemberId ? memberMap.get(settlement.fromMemberId)?.displayName : undefined) ??
          'Member';
        const isZeroPayment = meta?.zeroPayment === true || settlement.amountCents === 0;

        if (isZeroPayment) {
          return {
            id: settlement.id,
            groupId,
            mode: 'team' as const,
            amountCents: settlement.amountCents,
            amountDisplay,
            paidAt,
            paidAtLabel: formatPaidDateLabel(paidAt),
            fromLabel,
            toLabel,
            receiverName: receiverName || teamLabel,
            receiverEmail: receiver?.transferEmail ?? receiver?.email,
            status: 'paid' as const,
            summary: 'Team settlement confirmed',
            historyTitle: 'Team settlement confirmed',
            detailLine: `${teamLabel} settled together`,
            explanationLine: meta?.explanation,
            teamMemberNames,
            isZeroPayment: true,
            groupName,
          };
        }

        const explanationLine =
          meta?.explanation ?? `${paidByName} paid on behalf of ${teamLabel}`;
        const paidToLine = receiverName ? `Paid to ${receiverName}` : undefined;

        return {
          id: settlement.id,
          groupId,
          mode: 'team' as const,
          amountCents: settlement.amountCents,
          amountDisplay,
          paidAt,
          paidAtLabel: formatPaidDateLabel(paidAt),
          fromLabel,
          toLabel,
          receiverName,
          receiverEmail: receiver?.transferEmail ?? receiver?.email,
          status: 'paid' as const,
          summary: 'Team settlement',
          historyTitle: 'Team settlement',
          detailLine: `${paidByName} paid on behalf of ${teamLabel}`,
          explanationLine,
          paidToLine,
          teamMemberNames,
          isZeroPayment: false,
          groupName,
        };
      }

      const toInfo = settlement.toMemberId ? memberMap.get(settlement.toMemberId) : undefined;
      const fromInfo = settlement.fromMemberId ? memberMap.get(settlement.fromMemberId) : undefined;
      const receiverName = toInfo?.displayName ?? 'Member';

      return {
        id: settlement.id,
        groupId,
        mode: 'individual' as const,
        amountCents: settlement.amountCents,
        amountDisplay,
        paidAt,
        paidAtLabel: formatPaidDateLabel(paidAt),
        fromLabel: fromInfo?.displayName ?? 'Member',
        toLabel: receiverName,
        receiverName,
        receiverEmail: toInfo?.transferEmail ?? toInfo?.email,
        status: 'paid' as const,
        summary: `Paid ${receiverName}`,
        historyTitle: `Paid ${receiverName}`,
        detailLine: 'Individual · Settled',
        groupName,
      };
    });

  logger.info('Settlement history fetch succeeded', { groupId, count: history.length });
  return history;
}

function getAccessibleGroupsForUser(userId: string = getCurrentUserId()): { id: string; name: string }[] {
  const db = readDb();
  return db.groups
    .filter((group) => {
      if (group.ownerId === userId) {
        return true;
      }
      const member = findMemberForUser(group.id, userId, db);
      if (!member || member.isActive === false) {
        return false;
      }
      if (
        member.invitationStatus === 'pending' ||
        member.invitationStatus === 'declined' ||
        member.invitationStatus === 'removed'
      ) {
        return false;
      }
      return true;
    })
    .map((group) => ({ id: group.id, name: group.name }));
}

function isSettlementRelevantToUser(
  settlement: Settlement,
  groupId: string,
  userId: string,
  db = readDb(),
): boolean {
  const member = findMemberForUser(groupId, userId, db);
  if (!member) {
    return false;
  }

  if (settlement.mode === 'individual') {
    return settlement.fromMemberId === member.id;
  }

  const meta = parseSettlementMeta(settlement);
  if (settlement.fromMemberId === member.id) {
    return true;
  }
  if (meta?.paidByUserId === userId || meta?.paidByMemberId === member.id) {
    return true;
  }
  if (meta?.teamMemberIds?.includes(member.id)) {
    return true;
  }
  return false;
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

export function getGlobalSettlementHistoryForCurrentUser(
  userId: string = getCurrentUserId(),
): SettlementHistoryItemView[] {
  logger.info('Global settlement history fetch started', { userId });

  const groups = getAccessibleGroupsForUser(userId);
  const history: SettlementHistoryItemView[] = [];

  for (const group of groups) {
    const groupHistory = getSettlementHistory(group.id).filter((item) => {
      const db = readDb();
      const settlement = db.settlements.find((entry) => entry.id === item.id);
      if (!settlement) {
        return false;
      }
      return isSettlementRelevantToUser(settlement, group.id, userId, db);
    });
    history.push(...groupHistory);
  }

  history.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );

  logger.info('Global settlement history fetch succeeded', { count: history.length });
  return history;
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
