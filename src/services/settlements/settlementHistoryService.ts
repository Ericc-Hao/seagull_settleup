import { getCachedUserId } from '../../lib/auth';
import type { Settlement } from '../../types/models';
import type { SettlementHistoryItemView } from '../../types/views';
import { formatDateForDisplay } from '../../utils/date';
import { buildTeamDisplayLabel } from '../../utils/settlementMember';
import { formatCAD } from '../../utils/money';
import { createLogger } from '../../utils/logger';
import { findMemberForUser, getGroupOrThrow, readDb } from '../dbHelpers';
import { getAccessibleGroupsForUser } from '../groupAccess';
import { buildMemberMap, parseSettlementMeta } from './settlementCalculations';

function getCurrentUserId(): string {
  return getCachedUserId();
}

const logger = createLogger('settlementService');

function formatPaidDateLabel(isoDate: string): string {
  return formatDateForDisplay(new Date(isoDate));
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
