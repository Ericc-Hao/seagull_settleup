import {
  calculateMemberBalances,
  calculateTeamBalances,
  optimizeTransfers,
} from '../core/settlement';

import type { Trip, TripListItem, TripStatus } from './trip-types';
import type { DashboardSummary, TransferView } from './settle-context';

function transferKey(fromId: string, toId: string, amountCents: number): string {
  return `${fromId}->${toId}:${amountCents}`;
}

export function deriveTripStatus(trip: Trip): TripStatus {
  if (trip.status === 'archived') {
    return 'archived';
  }

  if (trip.lastSettlementAt && trip.expensesRevision > 0) {
    return 'ready_to_settle';
  }

  if (trip.status === 'settled') {
    return 'settled';
  }

  const memberCount = trip.members.length;
  const expenseCount = trip.expenses.length;

  if (memberCount < 2) {
    return 'planning';
  }
  if (expenseCount === 0) {
    return 'active';
  }
  if (expenseCount > 0 && memberCount >= 2) {
    return 'ready_to_settle';
  }
  return 'active';
}

export function statusHint(status: TripStatus, trip: Trip): string {
  switch (status) {
    case 'planning':
      return 'Add at least 2 people';
    case 'active':
      return 'Record expenses during the trip';
    case 'ready_to_settle':
      return trip.lastSettlementAt ? 'Expenses changed — review settlement' : 'Ready to settle when you are';
    case 'settled':
      return 'View settlement history';
    case 'archived':
      return 'Archived trip';
    default:
      return '';
  }
}

export function buildTripListItem(trip: Trip): TripListItem {
  const status = deriveTripStatus(trip);
  const totalSpentCents = trip.expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const settlementOutdated = Boolean(trip.lastSettlementAt && trip.expensesRevision > 0);

  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    status,
    memberCount: trip.members.length,
    expenseCount: trip.expenses.length,
    totalSpentCents,
    statusHint: statusHint(status, trip),
    settlementOutdated,
  };
}

export function canSettle(trip: Trip): { ok: boolean; reason?: string } {
  if (trip.members.length < 2) {
    return { ok: false, reason: 'Add at least 2 people before settling.' };
  }
  if (trip.expenses.length === 0) {
    return { ok: false, reason: 'Record at least one expense before settling.' };
  }
  return { ok: true };
}

export function buildTransfersForTrip(
  trip: Trip,
  mode: 'individual' | 'team',
): TransferView[] {
  const memberById = new Map(trip.members.map((m) => [m.id, m]));
  const teamById = new Map(trip.teams.map((t) => [t.id, t]));
  const memberBalances = calculateMemberBalances(trip.members, trip.expenses);
  const paidKeys = mode === 'individual' ? trip.paidIndividualKeys : trip.paidTeamKeys;

  if (mode === 'individual') {
    const transfers = optimizeTransfers(
      memberBalances.map((b) => ({ id: b.memberId, balanceCents: b.balanceCents })),
    );
    return transfers.map((transfer) => {
      const key = transferKey(transfer.fromId, transfer.toId, transfer.amountCents);
      const receiver = memberById.get(transfer.toId);
      return {
        key,
        fromId: transfer.fromId,
        toId: transfer.toId,
        amountCents: transfer.amountCents,
        fromLabel: memberById.get(transfer.fromId)?.displayName ?? transfer.fromId,
        toLabel: receiver?.displayName ?? transfer.toId,
        toEmtEmail: receiver?.emtEmail,
        paid: paidKeys.includes(key),
      };
    });
  }

  const balances = calculateTeamBalances(trip.members, trip.teams, memberBalances);
  const transfers = optimizeTransfers(balances.map((b) => ({ id: b.teamId, balanceCents: b.balanceCents })));

  return transfers.map((transfer) => {
    const key = transferKey(transfer.fromId, transfer.toId, transfer.amountCents);
    const toTeam = teamById.get(transfer.toId);
    const receiver = toTeam?.receiverMemberId ? memberById.get(toTeam.receiverMemberId) : undefined;
    return {
      key,
      fromId: transfer.fromId,
      toId: transfer.toId,
      amountCents: transfer.amountCents,
      fromLabel: teamById.get(transfer.fromId)?.name ?? transfer.fromId,
      toLabel: teamById.get(transfer.toId)?.name ?? transfer.toId,
      toEmtEmail: receiver?.emtEmail,
      paid: paidKeys.includes(key),
    };
  });
}

export function buildDashboardSummary(trip: Trip, individualTransfers: TransferView[], teamTransfers: TransferView[]): DashboardSummary {
  const expenses = trip.expenses;
  const members = trip.members;
  const memberById = new Map(members.map((m) => [m.id, m]));
  const memberBalances = calculateMemberBalances(members, expenses);

  const totalSpentCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const expenseCount = expenses.length;
  const memberCount = members.length;
  const averagePerMemberCents = memberCount > 0 ? Math.round(totalSpentCents / memberCount) : 0;

  const pendingIndividual = individualTransfers.filter((t) => !t.paid);
  const pendingTeam = teamTransfers.filter((t) => !t.paid);
  const pendingIndividualCents = pendingIndividual.reduce((s, t) => s + t.amountCents, 0);
  const pendingTeamCents = pendingTeam.reduce((s, t) => s + t.amountCents, 0);

  const individualProgressPercent =
    individualTransfers.length === 0
      ? 100
      : Math.round(((individualTransfers.length - pendingIndividual.length) / individualTransfers.length) * 100);
  const teamProgressPercent =
    teamTransfers.length === 0
      ? 100
      : Math.round(((teamTransfers.length - pendingTeam.length) / teamTransfers.length) * 100);

  const categoryMap = new Map<string, { totalCents: number; expenseCount: number }>();
  for (const expense of expenses) {
    const key = expense.category.trim() || 'Other';
    const current = categoryMap.get(key) ?? { totalCents: 0, expenseCount: 0 };
    categoryMap.set(key, {
      totalCents: current.totalCents + expense.amountCents,
      expenseCount: current.expenseCount + 1,
    });
  }

  const categorySummary = Array.from(categoryMap.entries())
    .map(([category, values]) => ({
      category,
      totalCents: values.totalCents,
      expenseCount: values.expenseCount,
      ratio: totalSpentCents === 0 ? 0 : values.totalCents / totalSpentCents,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const memberSummary = memberBalances
    .map((balance) => {
      const member = memberById.get(balance.memberId);
      return {
        memberId: balance.memberId,
        displayName: member?.displayName ?? balance.memberId,
        paidCents: balance.paidCents,
        owedCents: balance.owedCents,
        balanceCents: balance.balanceCents,
        paidShareRatio: totalSpentCents === 0 ? 0 : balance.paidCents / totalSpentCents,
      };
    })
    .sort((a, b) => b.balanceCents - a.balanceCents);

  return {
    totalSpentCents,
    expenseCount,
    memberCount,
    averagePerMemberCents,
    pendingIndividualCount: pendingIndividual.length,
    pendingTeamCount: pendingTeam.length,
    pendingIndividualCents,
    pendingTeamCents,
    individualProgressPercent,
    teamProgressPercent,
    categorySummary,
    memberSummary,
  };
}

export function countEmtMissing(members: Trip['members']): number {
  return members.filter((m) => !m.emtEmail?.trim()).length;
}

export function getMemberBalanceCents(trip: Trip, memberId: string): number {
  const balances = calculateMemberBalances(trip.members, trip.expenses);
  return balances.find((b) => b.memberId === memberId)?.balanceCents ?? 0;
}
