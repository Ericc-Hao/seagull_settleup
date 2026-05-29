import { describe, expect, it } from 'vitest';

import { INACTIVE_GROUP_EXPENSE_MESSAGE } from '../../services/groupService';
import type { Group } from '../../types/models';
import {
  getInactiveGroupExpenseMessage,
  isGroupInactiveForNewExpenses,
  validateAddExpenseAmount,
  validateAddExpenseForm,
  validateCategory,
  validateCustomSplit,
  validateSelectedGroup,
  validateSplitParticipants,
} from '../addExpense/addExpenseValidation';
import {
  normalizeInitialAmountText,
  normalizeInitialExpenseKind,
  normalizeInitialReceiptUri,
  normalizeReceiptConversion,
} from '../addExpense/addExpensePrefill';
import {
  buildEqualCustomAmountInputs,
  computeCustomAssignedTotal,
  computeEqualSplitShares,
  computeFillRemainingAmountCents,
  isCustomSplitTotalValid,
  parseCustomShareCentsByMember,
  shouldAutoFillCustomSplit,
} from '../addExpense/splitAmountHelpers';

const activeGroup: Group = {
  id: 'group-1',
  name: 'Trip',
  type: 'Trip',
  currency: 'CAD',
  startDate: '2026-05-01',
  settlementMode: 'individual',
  status: 'active',
  ownerId: 'user-1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

const inactiveGroup: Group = {
  ...activeGroup,
  id: 'group-inactive',
  status: 'inactive',
};

describe('addExpenseValidation', () => {
  it('validates amount', () => {
    expect(validateAddExpenseAmount(0)).toBe('Please enter an amount.');
    expect(validateAddExpenseAmount(100)).toBeUndefined();
  });

  it('validates selected group for split expenses', () => {
    expect(validateSelectedGroup('personal')).toBeUndefined();
    expect(validateSelectedGroup('split')).toBe('Please select a group.');
    expect(validateSelectedGroup('split', 'group-1', true)).toBe(INACTIVE_GROUP_EXPENSE_MESSAGE);
    expect(validateSelectedGroup('split', 'group-1', false)).toBeUndefined();
  });

  it('validates split participants', () => {
    expect(validateSplitParticipants('', [])).toBe('Please choose who paid.');
    expect(validateSplitParticipants('member-1', [])).toBe(
      'Please choose at least one person to split with.',
    );
    expect(validateSplitParticipants('member-1', ['member-1'])).toBeUndefined();
  });

  it('validates custom split totals', () => {
    expect(validateCustomSplit('equal', 1000, 0)).toBeUndefined();
    expect(validateCustomSplit('custom', 1000, 900)).toBe(
      'Custom split total must equal the expense amount.',
    );
    expect(validateCustomSplit('custom', 1000, 1000)).toBeUndefined();
  });

  it('validates category selection', () => {
    expect(validateCategory('')).toBe('Please select a category.');
    expect(validateCategory('food')).toBeUndefined();
  });

  it('combines validation in priority order', () => {
    expect(
      validateAddExpenseForm({
        amountCents: 0,
        kind: 'split',
        selectedGroupId: undefined,
        selectedGroupInactive: false,
        payerMemberId: '',
        splitMemberIds: [],
        splitMethod: 'equal',
        customAssignedTotal: 0,
        categoryKey: '',
      }),
    ).toBe('Please enter an amount.');

    expect(
      validateAddExpenseForm({
        amountCents: 1000,
        kind: 'split',
        selectedGroupId: 'group-1',
        selectedGroupInactive: false,
        payerMemberId: 'member-1',
        splitMemberIds: ['member-1'],
        splitMethod: 'equal',
        customAssignedTotal: 0,
        categoryKey: 'food',
      }),
    ).toBeUndefined();
  });

  it('detects inactive groups for new expenses', () => {
    expect(isGroupInactiveForNewExpenses(activeGroup)).toBe(false);
    expect(isGroupInactiveForNewExpenses(inactiveGroup)).toBe(true);
    expect(isGroupInactiveForNewExpenses(undefined)).toBe(false);
    expect(getInactiveGroupExpenseMessage()).toBe(INACTIVE_GROUP_EXPENSE_MESSAGE);
  });
});

describe('addExpensePrefill', () => {
  it('normalizes scan receipt conversion metadata', () => {
    expect(
      normalizeReceiptConversion(
        {
          amountCents: 1500,
          originalAmountMinor: 1100,
          originalCurrency: 'USD',
          exchangeRate: 1.36,
        },
        'CAD',
      ),
    ).toEqual({
      originalAmountMinor: 1100,
      originalCurrency: 'USD',
      convertedAmountMinor: 1500,
      convertedCurrency: 'CAD',
      exchangeRate: 1.36,
      exchangeRateTimestamp: undefined,
      exchangeRateProvider: undefined,
    });
  });

  it('normalizes initial form values from prefill', () => {
    expect(normalizeInitialExpenseKind(undefined)).toBe('split');
    expect(normalizeInitialExpenseKind({ expenseType: 'personal' })).toBe('personal');
    expect(normalizeInitialAmountText({ amountCents: 1234 }, 'CAD')).toBe('12.34');
    expect(normalizeInitialAmountText(undefined, 'CAD')).toBe('');
    expect(normalizeInitialReceiptUri({ receiptUri: 'file://receipt.jpg' })).toBe(
      'file://receipt.jpg',
    );
  });
});

describe('splitAmountHelpers', () => {
  it('computes equal split shares', () => {
    expect(computeEqualSplitShares(100, 0)).toEqual([]);
    expect(computeEqualSplitShares(0, 3)).toEqual([]);
    expect(computeEqualSplitShares(100, 3)).toEqual([34, 33, 33]);
  });

  it('parses custom share cents by member', () => {
    expect(
      parseCustomShareCentsByMember(
        ['member-a', 'member-b'],
        { 'member-a': '10.00', 'member-b': '5.50' },
        'CAD',
      ),
    ).toEqual({
      'member-a': 1000,
      'member-b': 550,
    });
  });

  it('computes custom assigned totals and validity', () => {
    const shares = { 'member-a': 600, 'member-b': 400 };
    expect(computeCustomAssignedTotal(['member-a', 'member-b'], shares)).toBe(1000);
    expect(isCustomSplitTotalValid('custom', 1000, 1000)).toBe(true);
    expect(isCustomSplitTotalValid('custom', 1000, 900)).toBe(false);
    expect(isCustomSplitTotalValid('equal', 1000, 0)).toBe(true);
  });

  it('computes fill remaining amount for the last participant', () => {
    expect(
      computeFillRemainingAmountCents(
        ['member-a', 'member-b', 'member-c'],
        { 'member-a': 300, 'member-b': 200, 'member-c': 0 },
        1000,
      ),
    ).toBe(500);
  });

  it('builds equal custom amount inputs', () => {
    expect(buildEqualCustomAmountInputs(['member-a', 'member-b'], 1000, 'CAD')).toEqual({
      'member-a': '5.00',
      'member-b': '5.00',
    });
  });

  it('detects when custom split should auto-fill', () => {
    expect(
      shouldAutoFillCustomSplit('custom', 1000, ['member-a'], { 'member-a': '' }),
    ).toBe(true);
    expect(
      shouldAutoFillCustomSplit('custom', 1000, ['member-a'], { 'member-a': '10.00' }),
    ).toBe(false);
    expect(shouldAutoFillCustomSplit('equal', 1000, ['member-a'], { 'member-a': '' })).toBe(
      false,
    );
  });
});
