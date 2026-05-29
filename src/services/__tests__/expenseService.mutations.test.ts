import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import type { DatabaseSnapshot } from '../../storage/types';
import {
  createPersonalExpense,
  deleteExpense,
  updateExpense,
} from '../expenseService';
import {
  createChainableQuery,
  createFromRouter,
  type ChainableQuery,
} from './helpers/supabaseQueryMock';

const { getUser, fromMock } = vi.hoisted(() => ({
  getUser: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from: fromMock,
  },
}));

const NOW = '2026-05-29T12:00:00.000Z';
const USER_ID = 'user-eric';

function createMutationFixture(): DatabaseSnapshot {
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
        ownerId: USER_ID,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    groupInvitations: [],
    groupMembers: [
      {
        id: 'member-eric',
        groupId: 'group-303',
        userId: USER_ID,
        displayName: 'Eric',
        nickname: 'Eric',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'member-chen',
        groupId: 'group-303',
        userId: 'user-chen',
        displayName: 'Chenrui',
        nickname: 'Chenrui',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    teams: [],
    teamMembers: [],
    expenses: [
      {
        id: 'expense-personal',
        groupId: undefined,
        type: 'personal',
        userId: USER_ID,
        amountCents: 5000,
        currency: 'CAD',
        category: 'Food & Drinks',
        description: 'Lunch',
        expenseDate: NOW,
        splitMethod: 'equal',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'expense-split',
        groupId: 'group-303',
        type: 'split',
        payerMemberId: 'member-eric',
        userId: USER_ID,
        amountCents: 20000,
        currency: 'CAD',
        category: 'Tickets',
        description: 'Tickets',
        expenseDate: NOW,
        splitMethod: 'equal',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    expenseSplits: [
      {
        id: 'split-eric',
        expenseId: 'expense-split',
        memberId: 'member-eric',
        shareAmountCents: 10000,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'split-chen',
        expenseId: 'expense-split',
        memberId: 'member-chen',
        shareAmountCents: 10000,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    settlements: [],
    receipts: [],
    categories: [],
  };
}

function personalExpenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'expense-new-personal',
    group_id: null,
    type: 'personal',
    payer_member_id: null,
    user_id: USER_ID,
    amount_cents: 3500,
    currency: 'CAD',
    category_id: null,
    category_name: 'Food & Drinks',
    description: 'Coffee',
    note: null,
    receipt_id: null,
    expense_date: '2026-05-29',
    deleted_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('expenseService mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    setCachedUserId(USER_ID);
    setCache(createMutationFixture());
  });

  describe('createPersonalExpense', () => {
    it('inserts a personal expense and returns the mapped expense', async () => {
      const insertQuery = createChainableQuery({
        data: personalExpenseRow(),
        error: null,
      });
      fromMock.mockImplementation(createFromRouter({ expenses: () => insertQuery }));

      const result = await createPersonalExpense({
        amountCents: 3500,
        categoryName: 'Food & Drinks',
        description: 'Coffee',
        expenseDate: '2026-05-29T10:00:00.000Z',
      });

      expect(insertQuery.insert).toHaveBeenCalledWith({
        group_id: null,
        type: 'personal',
        payer_member_id: null,
        user_id: USER_ID,
        amount_cents: 3500,
        currency: 'CAD',
        category_id: null,
        category_name: 'Food & Drinks',
        description: 'Coffee',
        note: null,
        expense_date: '2026-05-29',
      });
      expect(result.id).toBe('expense-new-personal');
      expect(result.type).toBe('personal');
      expect(result.amountCents).toBe(3500);
      expect(result.userId).toBe(USER_ID);
    });

    it('rejects when the user is not logged in', async () => {
      getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        createPersonalExpense({
          amountCents: 1000,
          categoryName: 'Food',
          description: 'Snack',
          expenseDate: '2026-05-29',
        }),
      ).rejects.toThrow('You must be logged in to save an expense.');
    });
  });

  describe('updateExpense', () => {
    it('updates expense fields via Supabase and returns the cached expense', async () => {
      const updateQuery = createChainableQuery({ data: null, error: null });
      fromMock.mockImplementation(createFromRouter({ expenses: () => updateQuery }));

      const result = await updateExpense('expense-personal', {
        amountCents: 7500,
        category: 'Transport',
        description: 'Transit pass',
        note: 'Monthly',
      });

      expect(updateQuery.update).toHaveBeenCalledWith({
        amount_cents: 7500,
        category_id: undefined,
        category_name: 'Transport',
        description: 'Transit pass',
        note: 'Monthly',
        receipt_id: undefined,
        expense_date: undefined,
        payer_member_id: undefined,
      });
      expect(result.id).toBe('expense-personal');
      expect(result.amountCents).toBe(5000);
    });

    it('replaces splits when participantMemberIds are provided', async () => {
      let expenseUpdateQuery: ChainableQuery;
      let splitDeleteQuery: ChainableQuery;
      let splitInsertQuery: ChainableQuery;

      fromMock.mockImplementation(
        createFromRouter({
          expenses: () => {
            expenseUpdateQuery = createChainableQuery({ data: null, error: null });
            return expenseUpdateQuery;
          },
          expense_splits: () => {
            if (!splitDeleteQuery) {
              splitDeleteQuery = createChainableQuery({ data: null, error: null });
              return splitDeleteQuery;
            }
            splitInsertQuery = createChainableQuery({ data: null, error: null });
            return splitInsertQuery;
          },
        }),
      );

      await updateExpense('expense-split', {
        amountCents: 18000,
        participantMemberIds: ['member-eric', 'member-chen'],
      });

      expect(expenseUpdateQuery!.update).toHaveBeenCalled();
      expect(splitDeleteQuery!.delete).toHaveBeenCalled();
      expect(splitInsertQuery!.insert).toHaveBeenCalledWith([
        {
          expense_id: 'expense-split',
          member_id: 'member-eric',
          share_amount_cents: 9000,
        },
        {
          expense_id: 'expense-split',
          member_id: 'member-chen',
          share_amount_cents: 9000,
        },
      ]);
    });
  });

  describe('deleteExpense', () => {
    it('soft-deletes an expense and returns delete metadata', async () => {
      const updateQuery = createChainableQuery({ data: null, error: null });
      fromMock.mockImplementation(createFromRouter({ expenses: () => updateQuery }));

      const result = await deleteExpense('expense-personal');

      expect(updateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
        }),
      );
      expect(result).toEqual({
        expenseId: 'expense-personal',
        groupId: null,
        type: 'personal',
      });
    });

    it('rejects when the expense does not exist', async () => {
      await expect(deleteExpense('missing-expense')).rejects.toThrow('Expense not found: missing-expense');
    });

    it('rejects when the user lacks delete permission', async () => {
      setCachedUserId('user-chen');

      await expect(deleteExpense('expense-personal')).rejects.toThrow(
        'You do not have permission to delete this expense.',
      );
    });
  });
});
