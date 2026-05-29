import { calculateMemberBalances, optimizeTransfers } from '../../core/settlement';
import type { MemberBalance } from '../../core/settlement/types';
import { getCachedUserId } from '../../lib/auth';
import type { GroupMember, Settlement } from '../../types/models';
import type { CoveredBalanceView, PendingTransferView, TeamSettlementPreviewView } from '../../types/views';
import { isBalanceEligibleMember } from '../../utils/groupParticipants';
import {
  buildMemberDisplayLabel,
  buildTeamDisplayLabel,
  resolveSettlementMember,
  type SettlementMemberInfo,
} from '../../utils/settlementMember';
import { formatCAD } from '../../utils/money';
import { createLogger } from '../../utils/logger';
import { buildPaymentMessage } from '../../utils/paymentCopy';
import {
  findMemberForUser,
  getExpenseSplits,
  getGroupExpenses,
  getGroupMembers,
  getGroupOrThrow,
  getMemberTeamId,
  readDb,
} from '../dbHelpers';

function getCurrentUserId(): string {
  return getCachedUserId();
}

const logger = createLogger('settlementService');

function getSettleableMembers(groupId: string, db = readDb()): GroupMember[] {
  return getGroupMembers(groupId, db).filter((member) => isBalanceEligibleMember(member));
}

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

export interface SettlementTeamMeta {
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
export function buildMemberMap(groupId: string, db = readDb()): Map<string, SettlementMemberInfo> {
  const map = new Map<string, SettlementMemberInfo>();
  for (const member of getSettleableMembers(groupId, db)) {
    map.set(member.id, resolveSettlementMember(member, db.profiles));
  }
  return map;
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

export function toCoreMembers(groupId: string): CoreMember[] {
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

export function parseSettlementMeta(settlement: Settlement): SettlementTeamMeta | null {
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

export function buildTeamTransferView(
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

export function getCurrentMemberId(groupId: string, userId: string = getCurrentUserId()): string | undefined {
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

export function buildTeamSettlementExplanation(
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
