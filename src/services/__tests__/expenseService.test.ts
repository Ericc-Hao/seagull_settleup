import { beforeEach, describe, expect, it } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import type { DatabaseSnapshot } from '../../storage/types';
import { getGroupExpenses } from '../dbHelpers';
import {
  canDeleteExpense,
  getCurrentUserMonthlyExpenseSummary,
  getExpensesSummary,
  getRecentGroupExpensesForCurrentUser,
} from '../expenseService';

function createExpenseFixture(): DatabaseSnapshot {
  const now = new Date().toISOString();
  const monthDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15T12:00:00.000Z`;

  return {
    users: [],
    profiles: [],
    groups: [
      {
        id: 'group-303',
        name: 'test 303',
        type: 'Trip',
        currency: 'CAD',
        startDate: '2026-05-20',
        settlementMode: 'individual',
        status: 'active',
        ownerId: 'user-eric',
        createdAt: now,
        updatedAt: now,
      },
    ],
    groupInvitations: [],
    groupMembers: [
      {
        id: 'member-eric',
        groupId: 'group-303',
        userId: 'user-eric',
        displayName: 'Eric',
        nickname: 'Eric',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-chen',
        groupId: 'group-303',
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
        id: 'expense-personal',
        groupId: undefined,
        type: 'personal',
        userId: 'user-eric',
        amountCents: 5000,
        currency: 'CAD',
        category: 'Food & Drinks',
        description: 'Lunch',
        expenseDate: monthDate,
        splitMethod: 'equal',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'expense-split',
        groupId: 'group-303',
        type: 'split',
        payerMemberId: 'member-chen',
        userId: 'user-chen',
        amountCents: 20000,
        currency: 'CAD',
        category: 'Tickets',
        description: 'Tickets',
        expenseDate: monthDate,
        splitMethod: 'equal',
        createdAt: now,
        updatedAt: now,
      },
    ],
    expenseSplits: [
      {
        id: 'split-eric',
        expenseId: 'expense-split',
        memberId: 'member-eric',
        shareAmountCents: 10000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'split-chen',
        expenseId: 'expense-split',
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

describe('expenseService monthly summary', () => {
  beforeEach(() => {
    setCachedUserId('user-eric');
    setCache(createExpenseFixture());
  });

  it('totals personal spending plus split share, not full split expense', () => {
    const summary = getCurrentUserMonthlyExpenseSummary();
    expect(summary.personalTotalCents).toBe(5000);
    expect(summary.splitShareTotalCents).toBe(10000);
    expect(summary.totalSpentCents).toBe(15000);
  });

  it('getExpensesSummary uses the same total spent logic', () => {
    const summary = getExpensesSummary('user-eric');
    expect(summary.totalSpentCents).toBe(15000);
    expect(summary.personalTotalCents).toBe(5000);
    expect(summary.splitShareCents).toBe(10000);
  });
});

describe('getRecentGroupExpensesForCurrentUser', () => {
  beforeEach(() => {
    setCachedUserId('user-eric');
    setCache(createExpenseFixture());
  });

  it('returns share amount, total amount, and not settled status', () => {
    const expenses = getRecentGroupExpensesForCurrentUser('group-303');
    expect(expenses).toHaveLength(1);
    expect(expenses[0].myShareAmountCents).toBe(10000);
    expect(expenses[0].totalAmountCents).toBe(20000);
    expect(expenses[0].settlementStatus).toBe('not_settled');
    expect(expenses[0].includedInSplit).toBe(true);
  });

  it('marks expenses as settled when adjusted group balance is zero', () => {
    const now = new Date().toISOString();
    setCache({
      ...createExpenseFixture(),
      settlements: [
        {
          id: 'settlement-1',
          groupId: 'group-303',
          mode: 'individual',
          fromMemberId: 'member-eric',
          toMemberId: 'member-chen',
          amountCents: 10000,
          currency: 'CAD',
          status: 'paid',
          paidAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const expenses = getRecentGroupExpensesForCurrentUser('group-303');
    expect(expenses[0].settlementStatus).toBe('settled');
  });

  it('marks expenses without splits as not split yet', () => {
    const now = new Date().toISOString();
    setCache({
      ...createExpenseFixture(),
      expenses: [
        {
          id: 'expense-no-splits',
          groupId: 'group-303',
          type: 'split',
          payerMemberId: 'member-chen',
          userId: 'user-chen',
          amountCents: 5000,
          currency: 'CAD',
          category: 'Food & Drinks',
          description: 'Dinner',
          expenseDate: now,
          splitMethod: 'equal',
          createdAt: now,
          updatedAt: now,
        },
      ],
      expenseSplits: [],
    });

    const expenses = getRecentGroupExpensesForCurrentUser('group-303');
    expect(expenses[0].settlementStatus).toBe('not_split');
    expect(expenses[0].myShareAmountCents).toBe(0);
    expect(expenses[0].includedInSplit).toBe(false);
  });

  it('marks not-included member expenses as settled with zero share', () => {
    const now = new Date().toISOString();
    setCache({
      ...createExpenseFixture(),
      groupMembers: [
        ...createExpenseFixture().groupMembers,
        {
          id: 'member-third',
          groupId: 'group-303',
          userId: 'user-third',
          displayName: 'Alex',
          nickname: 'Alex',
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
    setCachedUserId('user-third');

    const expenses = getRecentGroupExpensesForCurrentUser('group-303');
    expect(expenses).toHaveLength(1);
    expect(expenses[0].myShareAmountCents).toBe(0);
    expect(expenses[0].includedInSplit).toBe(false);
    expect(expenses[0].settlementStatus).toBe('settled');
  });

  it('excludes soft-deleted group expenses from group expense queries', () => {
    const fixture = createExpenseFixture();
    setCache({
      ...fixture,
      expenses: [
        ...fixture.expenses,
        {
          ...fixture.expenses[1],
          id: 'expense-deleted',
          deletedAt: new Date().toISOString(),
        },
      ],
    });

    const groupExpenses = getGroupExpenses('group-303');
    expect(groupExpenses.map((expense) => expense.id)).toEqual(['expense-split']);
  });

  it('allows expense creator and group owner to delete split expenses', () => {
    setCache(createExpenseFixture());
    setCachedUserId('user-chen');
    expect(canDeleteExpense('expense-split')).toBe(true);

    setCachedUserId('user-eric');
    expect(canDeleteExpense('expense-split')).toBe(true);

    setCachedUserId('user-third');
    expect(canDeleteExpense('expense-split')).toBe(false);
  });

  it('allows only creator to delete personal expenses', () => {
    setCache(createExpenseFixture());
    setCachedUserId('user-eric');
    expect(canDeleteExpense('expense-personal')).toBe(true);

    setCachedUserId('user-chen');
    expect(canDeleteExpense('expense-personal')).toBe(false);
  });
});
