import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import { INACTIVE_GROUP_EXPENSE_MESSAGE } from '../groupAccess';

const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    from: vi.fn(),
  },
}));

describe('createSplitExpense inactive group guard', () => {
  beforeEach(() => {
    getUser.mockResolvedValue({
      data: { user: { id: 'user-eric' } },
      error: null,
    });
    setCachedUserId('user-eric');
    setCache({
      users: [],
      profiles: [],
      groups: [
        {
          id: 'group-inactive',
          name: 'Old Trip',
          type: 'Trip',
          currency: 'CAD',
          startDate: '2026-01-01',
          settlementMode: 'individual',
          status: 'inactive',
          ownerId: 'user-eric',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      groupMembers: [],
      groupInvitations: [],
      teams: [],
      teamMembers: [],
      expenses: [],
      expenseSplits: [],
      settlements: [],
      receipts: [],
      categories: [],
    });
  });

  it('blocks expense creation when cached group is inactive', async () => {
    const { createSplitExpense } = await import('../expenseService');

    await expect(
      createSplitExpense({
        groupId: 'group-inactive',
        payerMemberId: 'member-1',
        amountCents: 1000,
        categoryName: 'Food',
        description: 'Lunch',
        expenseDate: '2026-05-29',
        splitMethod: 'equal',
        splits: [{ memberId: 'member-1', shareAmountCents: 1000 }],
      }),
    ).rejects.toThrow(INACTIVE_GROUP_EXPENSE_MESSAGE);
  });
});
