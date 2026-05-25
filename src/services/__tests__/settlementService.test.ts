import { beforeEach, describe, expect, it } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import type { DatabaseSnapshot } from '../../storage/types';
import {
  applyPaidSettlements,
  calculateGroupBalances,
  calculateIndividualPendingTransfersForCurrentUser,
  calculateTeamPendingTransfersForCurrentUser,
  calculateTeamSettlementPreview,
  createEmptySettleUpView,
  getSettlementHistory,
  getSettleUpView,
  getCurrentUserGroupBalanceSummary,
  getGlobalPendingTransfersForCurrentUser,
  getGlobalSettlementHistoryForCurrentUser,
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
    expect(history[0].historyTitle).toBe('Paid A');
    expect(history[0].detailLine).toBe('Individual · Settled');
    expect(history[0].amountCents).toBe(72500);
    expect(history[0].status).toBe('paid');
  });

  it('builds team settlement history with metadata member names', () => {
    const now = new Date().toISOString();
    setCache({
      ...createSettlementFixture(),
      settlements: [
        {
          id: 'settlement-team-1',
          groupId: 'group-test',
          mode: 'team',
          fromMemberId: 'member-three',
          toMemberId: 'member-one',
          amountCents: 50000,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
          metadata: {
            teamMemberIds: ['member-three', 'member-four'],
            teamMemberNames: ['C', 'D'],
            settlementType: 'temporary_team',
            fromMemberIds: ['member-three', 'member-four'],
            toMemberIds: ['member-one'],
            fromLabel: 'C + D',
            toLabel: 'A',
          },
        },
      ],
    });

    const history = getSettlementHistory('group-test');
    expect(history).toHaveLength(1);
    expect(history[0].historyTitle).toBe('Team settlement');
    expect(history[0].detailLine).toBe('C paid on behalf of C + D');
    expect(history[0].paidToLine).toBe('Paid to A');
    expect(history[0].teamMemberNames).toEqual(['C', 'D']);
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

function createTeamScenarioFixture(): DatabaseSnapshot {
  const now = new Date().toISOString();
  return {
    users: [],
    profiles: [],
    groups: [
      {
        id: 'group-team',
        name: 'Team Trip',
        type: 'Trip',
        currency: 'CAD',
        startDate: '2026-05-20',
        settlementMode: 'individual',
        status: 'active',
        ownerId: 'user-alice',
        createdAt: now,
        updatedAt: now,
      },
    ],
    groupInvitations: [],
    groupMembers: [
      {
        id: 'member-alice',
        groupId: 'group-team',
        userId: 'user-alice',
        displayName: 'Alice',
        nickname: 'Alice',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-eric',
        groupId: 'group-team',
        userId: 'user-eric',
        displayName: 'Eric',
        nickname: 'Eric',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-chen',
        groupId: 'group-team',
        userId: 'user-chen',
        displayName: 'Chenrui',
        nickname: 'Chenrui',
        createdAt: now,
        updatedAt: now,
      },
    ],
    teams: [],
    teamMembers: [],
    expenses: [
      {
        id: 'expense-alice-paid',
        groupId: 'group-team',
        type: 'split',
        payerMemberId: 'member-alice',
        userId: 'user-alice',
        amountCents: 20000,
        currency: 'CAD',
        category: 'Food',
        description: 'Group dinner',
        expenseDate: now,
        splitMethod: 'custom',
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenseSplits: [
      {
        id: 'split-eric',
        expenseId: 'expense-alice-paid',
        memberId: 'member-eric',
        shareAmountCents: 10000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'split-chen',
        expenseId: 'expense-alice-paid',
        memberId: 'member-chen',
        shareAmountCents: 10000,
        createdAt: now,
        updatedAt: now,
      },
    ],
    settlements: [],
    receipts: [],
    categories: [],
  };
}

describe('team settlement covered balances', () => {
  beforeEach(() => {
    setCache(createTeamScenarioFixture());
    setCachedUserId('user-eric');
  });

  it('scenario A: team preview covers both debtors owing Alice', () => {
    const preview = calculateTeamSettlementPreview(
      'group-team',
      ['member-eric', 'member-chen'],
      'user-eric',
    );

    expect(preview).not.toBeNull();
    expect(preview?.amountCents).toBe(20000);
    expect(preview?.teamBalanceCents).toBe(-20000);
    expect(preview?.coveredBalances).toHaveLength(2);
    expect(preview?.coveredBalances?.every((entry) => entry.role === 'debtor')).toBe(true);
    expect(preview?.explanation).toContain('Eric');
    expect(preview?.explanation).toContain('Chenrui');
  });

  it('scenario A: paid team settlement clears pending transfers for all selected members', () => {
    const preview = calculateTeamSettlementPreview(
      'group-team',
      ['member-eric', 'member-chen'],
      'user-eric',
    );
    expect(preview).not.toBeNull();

    const now = new Date().toISOString();
    setCache({
      ...createTeamScenarioFixture(),
      settlements: [
        {
          id: 'team-settlement-a',
          groupId: 'group-team',
          mode: 'team',
          fromMemberId: 'member-eric',
          toMemberId: 'member-alice',
          amountCents: 20000,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
          metadata: {
            settlementType: 'temporary_team',
            paidByMemberId: 'member-eric',
            paidByName: 'Eric',
            teamMemberIds: ['member-eric', 'member-chen'],
            teamMemberNames: ['Eric', 'Chenrui'],
            coveredBalances: preview?.coveredBalances,
            explanation: preview?.explanation,
          },
        },
      ],
    });

    expect(calculateIndividualPendingTransfersForCurrentUser('group-team', 'user-eric')).toHaveLength(0);
    expect(calculateIndividualPendingTransfersForCurrentUser('group-team', 'user-chen')).toHaveLength(0);

    const adjusted = applyPaidSettlements('group-team', calculateGroupBalances('group-team'));
    const byId = new Map(adjusted.map((entry) => [entry.memberId, entry.balanceCents]));
    expect(byId.get('member-eric')).toBe(0);
    expect(byId.get('member-chen')).toBe(0);
    expect(byId.get('member-alice')).toBe(0);
  });

  it('scenario C: Eric pays on behalf of Chenrui when Eric has zero balance', () => {
    const now = new Date().toISOString();
    setCache({
      ...createTeamScenarioFixture(),
      expenses: [
        {
          id: 'expense-chen-owes',
          groupId: 'group-team',
          type: 'split',
          payerMemberId: 'member-alice',
          userId: 'user-alice',
          amountCents: 10000,
          currency: 'CAD',
          category: 'Food',
          description: 'Chenrui share',
          expenseDate: now,
          splitMethod: 'custom',
          createdAt: now,
          updatedAt: now,
        },
      ],
      expenseSplits: [
        {
          id: 'split-chen-only',
          expenseId: 'expense-chen-owes',
          memberId: 'member-chen',
          shareAmountCents: 10000,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    setCachedUserId('user-eric');
    const ericBefore = calculateIndividualPendingTransfersForCurrentUser('group-team', 'user-eric');
    expect(ericBefore).toHaveLength(0);

    const chenBefore = calculateIndividualPendingTransfersForCurrentUser('group-team', 'user-chen');
    expect(chenBefore).toHaveLength(1);
    expect(chenBefore[0].amountCents).toBe(10000);

    const preview = calculateTeamSettlementPreview(
      'group-team',
      ['member-eric', 'member-chen'],
      'user-eric',
    );
    expect(preview?.amountCents).toBe(10000);
    expect(preview?.coveredBalances?.find((entry) => entry.memberId === 'member-chen')?.role).toBe('debtor');
    expect(preview?.coveredBalances?.find((entry) => entry.memberId === 'member-eric')?.role).toBe('offset');
  });

  it('returns zero-payment preview when selected team balance is zero', () => {
    setCache({
      ...createTeamScenarioFixture(),
      expenses: [
        {
          id: 'expense-eric-paid',
          groupId: 'group-team',
          type: 'split',
          payerMemberId: 'member-eric',
          userId: 'user-eric',
          amountCents: 20000,
          currency: 'CAD',
          category: 'Food',
          description: 'Eric covered dinner',
          expenseDate: new Date().toISOString(),
          splitMethod: 'custom',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      expenseSplits: [
        {
          id: 'split-eric',
          expenseId: 'expense-eric-paid',
          memberId: 'member-eric',
          shareAmountCents: 10000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'split-chen',
          expenseId: 'expense-eric-paid',
          memberId: 'member-chen',
          shareAmountCents: 10000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const preview = calculateTeamSettlementPreview(
      'group-team',
      ['member-eric', 'member-chen'],
      'user-eric',
    );

    expect(preview).not.toBeNull();
    expect(preview?.teamBalanceCents).toBe(0);
    expect(preview?.amountCents).toBe(0);
    expect(preview?.requiresPayment).toBe(false);
    expect(preview?.zeroPayment).toBe(true);
    expect(preview?.explanation).toContain('settled together');
    expect(preview?.selectedMemberNames).toEqual(['Eric', 'Chenrui']);
  });

  it('zero-payment team settlement does not distort balances', () => {
    const now = new Date().toISOString();
    setCache({
      ...createTeamScenarioFixture(),
      expenses: [
        {
          id: 'expense-eric-paid',
          groupId: 'group-team',
          type: 'split',
          payerMemberId: 'member-eric',
          userId: 'user-eric',
          amountCents: 20000,
          currency: 'CAD',
          category: 'Food',
          description: 'Eric covered dinner',
          expenseDate: now,
          splitMethod: 'custom',
          createdAt: now,
          updatedAt: now,
        },
      ],
      expenseSplits: [
        {
          id: 'split-eric',
          expenseId: 'expense-eric-paid',
          memberId: 'member-eric',
          shareAmountCents: 10000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'split-chen',
          expenseId: 'expense-eric-paid',
          memberId: 'member-chen',
          shareAmountCents: 10000,
          createdAt: now,
          updatedAt: now,
        },
      ],
      settlements: [
        {
          id: 'team-settlement-zero',
          groupId: 'group-team',
          mode: 'team',
          fromMemberId: 'member-eric',
          toMemberId: null,
          amountCents: 0,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
          metadata: {
            teamMemberIds: ['member-eric', 'member-chen'],
            teamMemberNames: ['Eric', 'Chenrui'],
            settlementType: 'temporary_team',
            zeroPayment: true,
            coveredBalances: [
              {
                memberId: 'member-eric',
                memberName: 'Eric',
                balanceBeforeCents: 10000,
                coveredAmountCents: 10000,
                role: 'creditor',
              },
              {
                memberId: 'member-chen',
                memberName: 'Chenrui',
                balanceBeforeCents: -10000,
                coveredAmountCents: 10000,
                role: 'debtor',
              },
            ],
            explanation: 'Eric and Chenrui are settled together for this group.',
          },
        },
      ],
    });

    const raw = calculateGroupBalances('group-team');
    const adjusted = applyPaidSettlements('group-team', raw);
    const rawMap = new Map(raw.map((entry) => [entry.memberId, entry.balanceCents]));
    const adjustedMap = new Map(adjusted.map((entry) => [entry.memberId, entry.balanceCents]));

    expect(adjustedMap.get('member-eric')).toBe(rawMap.get('member-eric'));
    expect(adjustedMap.get('member-chen')).toBe(rawMap.get('member-chen'));

    const history = getSettlementHistory('group-team');
    expect(history[0].historyTitle).toBe('Team settlement confirmed');
    expect(history[0].detailLine).toBe('Eric + Chenrui settled together');
    expect(history[0].isZeroPayment).toBe(true);
    expect(history[0].paidToLine).toBeUndefined();
  });

  it('payment-required preview includes team payment message', () => {
    const preview = calculateTeamSettlementPreview(
      'group-team',
      ['member-eric', 'member-chen'],
      'user-eric',
    );

    expect(preview?.requiresPayment).toBe(true);
    expect(preview?.paymentMessage).toContain('Team Trip team settlement');
    expect(preview?.paymentMessage).toContain('Eric + Chenrui');
    expect(preview?.paymentMessage).toContain('Alice');
  });
});

describe('global pending transfers', () => {
  beforeEach(() => {
    setCache(createSettlementFixture());
    setCachedUserId('user-c');
  });

  it('aggregates outgoing transfers across accessible groups', () => {
    const transfers = getGlobalPendingTransfersForCurrentUser('user-c');
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((transfer) => transfer.groupName === 'Shared Weekend')).toBe(true);
    expect(transfers.every((transfer) => transfer.groupId === 'group-test')).toBe(true);
  });

  it('returns global settlement history only for current user payments', () => {
    const now = new Date().toISOString();
    setCache({
      ...createSettlementFixture(),
      settlements: [
        {
          id: 'settlement-by-c',
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
        {
          id: 'settlement-by-a',
          groupId: 'group-test',
          mode: 'individual',
          fromMemberId: 'member-one',
          toMemberId: 'member-three',
          amountCents: 10000,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const history = getGlobalSettlementHistoryForCurrentUser('user-c');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('settlement-by-c');
    expect(history[0].groupName).toBe('Shared Weekend');
  });

  it('includes groupName on group settlement history items', () => {
    const history = getSettlementHistory('group-test');
    expect(history.every((item) => item.groupName === 'Shared Weekend' || history.length === 0)).toBe(true);
  });
});
