import { beforeEach, describe, expect, it } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import type { DatabaseSnapshot } from '../../storage/types';
import {
  applyPaidSettlements,
  calculateGroupBalances,
  calculateIndividualPendingTransfersForCurrentUser,
  calculateTeamPendingTransfersForCurrentUser,
  createEmptySettleUpView,
  getSettlementHistory,
  getSettleUpView,
  getCurrentUserGroupBalanceSummary,
} from '../settlementService';

function createSettlementFixture(): DatabaseSnapshot {
  const now = new Date().toISOString();
  return {
    users: [],
    profiles: [],
    groups: [
      {
        id: 'group-test',
        name: 'Shared Weekend',
        type: 'Trip',
        currency: 'CAD',
        startDate: '2026-05-20',
        endDate: '2026-05-25',
        settlementMode: 'individual',
        status: 'active',
        ownerId: 'user-a',
        createdAt: now,
        updatedAt: now,
      },
    ],
    groupInvitations: [],
    groupMembers: [
      {
        id: 'member-one',
        groupId: 'group-test',
        userId: 'user-a',
        displayName: 'A',
        nickname: 'A',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-two',
        groupId: 'group-test',
        userId: 'user-b',
        displayName: 'B',
        nickname: 'B',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-three',
        groupId: 'group-test',
        userId: 'user-c',
        displayName: 'C',
        nickname: 'C',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-four',
        groupId: 'group-test',
        userId: 'user-d',
        displayName: 'D',
        nickname: 'D',
        createdAt: now,
        updatedAt: now,
      },
    ],
    teams: [],
    teamMembers: [],
    expenses: [
      {
        id: 'expense-a',
        groupId: 'group-test',
        type: 'split',
        payerMemberId: 'member-one',
        userId: 'user-a',
        amountCents: 200000,
        currency: 'CAD',
        category: 'Hotel',
        description: 'Lodging',
        expenseDate: now,
        splitMethod: 'equal',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'expense-b',
        groupId: 'group-test',
        type: 'split',
        payerMemberId: 'member-two',
        userId: 'user-b',
        amountCents: 90000,
        currency: 'CAD',
        category: 'Food',
        description: 'Dinner',
        expenseDate: now,
        splitMethod: 'equal',
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenseSplits: [
      ...['member-one', 'member-two', 'member-three', 'member-four'].map((memberId) => ({
        id: `split-a-${memberId}`,
        expenseId: 'expense-a',
        memberId,
        shareAmountCents: 50000,
        createdAt: now,
        updatedAt: now,
      })),
      ...['member-one', 'member-two', 'member-three', 'member-four'].map((memberId) => ({
        id: `split-b-${memberId}`,
        expenseId: 'expense-b',
        memberId,
        shareAmountCents: 22500,
        createdAt: now,
        updatedAt: now,
      })),
    ],
    settlements: [],
    receipts: [],
    categories: [],
  };
}

describe('settlementService', () => {
  beforeEach(() => {
    setCache(createSettlementFixture());
    setCachedUserId('user-c');
  });

  it('calculates member balances from cached Supabase rows', () => {
    const balances = calculateGroupBalances('group-test');
    const byId = new Map(balances.map((entry) => [entry.memberId, entry.balanceCents]));
    expect(byId.get('member-one')).toBe(127500);
    expect(byId.get('member-two')).toBe(17500);
    expect(byId.get('member-three')).toBe(-72500);
    expect(byId.get('member-four')).toBe(-72500);
  });

  it('shows only current user outgoing individual transfers', () => {
    const transfers = calculateIndividualPendingTransfersForCurrentUser('group-test', 'user-c');
    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromMemberId).toBe('member-three');
    expect(transfers[0].toMemberId).toBe('member-one');
    expect(transfers[0].amountCents).toBe(72500);
  });

  it('hides paid individual transfers after settlement is applied', () => {
    const now = new Date().toISOString();
    setCache({
      ...createSettlementFixture(),
      settlements: [
        {
          id: 'settlement-1',
          groupId: 'group-test',
          mode: 'individual',
          fromMemberId: 'member-three',
          toMemberId: 'member-one',
          amountCents: 72500,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const adjusted = applyPaidSettlements('group-test', calculateGroupBalances('group-test'));
    const byId = new Map(adjusted.map((entry) => [entry.memberId, entry.balanceCents]));
    expect(byId.get('member-three')).toBe(0);
    expect(byId.get('member-one')).toBe(55000);

    const transfers = calculateIndividualPendingTransfersForCurrentUser('group-test', 'user-c');
    expect(transfers).toHaveLength(0);
  });

  it('calculates team outgoing transfers for current user team', () => {
    setCachedUserId('user-d');
    const transfers = calculateTeamPendingTransfersForCurrentUser(
      'group-test',
      ['member-four', 'member-two'],
      'user-d',
    );
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((transfer) => transfer.fromMemberIds?.includes('member-four'))).toBe(true);
  });

  it('builds settlement history from paid records', () => {
    const now = new Date().toISOString();
    setCache({
      ...createSettlementFixture(),
      settlements: [
        {
          id: 'settlement-history-1',
          groupId: 'group-test',
          mode: 'individual',
          fromMemberId: 'member-three',
          toMemberId: 'member-one',
          amountCents: 72500,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const history = getSettlementHistory('group-test');
    expect(history).toHaveLength(1);
    expect(history[0].summary).toContain('Paid');
    expect(history[0].amountCents).toBe(72500);
    expect(history[0].status).toBe('paid');
  });

  it('returns empty settle up view for missing group', () => {
    const view = getSettleUpView('missing-group');
    expect(view).toEqual(createEmptySettleUpView('missing-group'));
  });

  it('returns settled balance summary after paid settlement', () => {
    const now = new Date().toISOString();
    setCache({
      ...createSettlementFixture(),
      settlements: [
        {
          id: 'settlement-1',
          groupId: 'group-test',
          mode: 'individual',
          fromMemberId: 'member-three',
          toMemberId: 'member-one',
          amountCents: 72500,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    setCachedUserId('user-c');
    const summary = getCurrentUserGroupBalanceSummary('group-test', 'user-c');
    expect(summary.adjustedBalanceCents).toBe(0);
    expect(summary.status).toBe('settled');
    expect(summary.label).toBe('Settled');
  });

  it('skips split expenses without a payer instead of throwing', () => {
    const now = new Date().toISOString();
    setCache({
      ...createSettlementFixture(),
      expenses: [
        {
          id: 'expense-no-payer',
          groupId: 'group-test',
          type: 'split',
          userId: 'user-a',
          amountCents: 1000,
          currency: 'CAD',
          category: 'Food',
          description: 'Missing payer',
          expenseDate: now,
          splitMethod: 'equal',
          createdAt: now,
          updatedAt: now,
        },
      ],
      expenseSplits: [],
    });

    expect(() => getSettleUpView('group-test')).not.toThrow();
    expect(getSettleUpView('group-test').outgoingTransfers).toEqual([]);
  });
});
